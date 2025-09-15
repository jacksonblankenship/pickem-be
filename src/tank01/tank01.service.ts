import { ConfigService } from '@/config/config.service';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { inject, injectable } from 'inversify';
import z, { ZodError } from 'zod';
import { TANK01_TOTAL_ODDS_KEYS } from './tank01.constants';
import {
  MissingOddsError,
  Tank01ApiError,
  Tank01Error,
  Tank01SchemaError,
} from './tank01.errors';
import {
  Tank01GameOdds,
  tank01GameOddsSchema,
  tank01GameSchema,
  Tank01GameStatus,
  tank01GameStatusSchema,
  tank01Response,
  Tank01Team,
  tank01TeamSchema,
} from './tank01.schema';
import { Tank01Game } from './tank01.types';

@injectable()
export class Tank01Service {
  private readonly client: AxiosInstance;

  constructor(
    @inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.client = axios.create({
      baseURL:
        'https://tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com',
      headers: {
        'X-Rapidapi-Key': this.configService.getConfigValue('RAPID_API_KEY'),
        'X-Rapidapi-Host': this.configService.getConfigValue('RAPID_API_HOST'),
      },
    });
  }

  public async getGames(params: {
    week: number;
    year: number;
  }): Promise<Tank01Game[]> {
    const response = await this.client.get<unknown>('getNFLGamesForWeek', {
      params: {
        week: params.week,
        season: params.year,
        seasonType: 'reg',
      },
    });

    try {
      const { body } = tank01Response(tank01GameSchema.array()).parse(
        response.data,
      );

      return body;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        throw new Tank01ApiError(error.message, {
          cause: error,
          meta: params,
        });
      }

      if (error instanceof ZodError) {
        throw new Tank01SchemaError(error.message, {
          cause: error,
          meta: params,
        });
      }

      throw new Tank01Error('Unknown error occurred', {
        cause: error,
        meta: params,
      });
    }
  }

  private isCompleteOdds(
    odds: Partial<Tank01GameOdds>,
  ): odds is Tank01GameOdds {
    const values = Object.values(odds);

    return (
      values.every(value => value !== undefined) &&
      values.length === TANK01_TOTAL_ODDS_KEYS
    );
  }

  public async getGameStatus(params: {
    tank01GameId: string;
  }): Promise<Tank01GameStatus> {
    try {
      const response = await this.client.get<unknown>('getNFLScoresOnly', {
        params: {
          gameID: params.tank01GameId,
          topPerformers: 'false',
        },
      });

      const { body } = tank01Response(
        z.record(z.literal(params.tank01GameId), tank01GameStatusSchema),
      ).parse(response.data);

      return body[params.tank01GameId];
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Tank01ApiError(error.message, {
          cause: error,
          meta: params,
        });
      }

      if (error instanceof ZodError) {
        throw new Tank01SchemaError(error.message, {
          cause: error,
          meta: params,
        });
      }

      throw new Tank01Error('Unknown error occurred', {
        cause: error,
        meta: params,
      });
    }
  }

  public async getGameOdds(params: {
    tank01GameId: string;
  }): Promise<Tank01GameOdds> {
    const preferredSportsBooks = [
      'bet365',
      'fanduel',
      'draftkings',
      'caesars_sportsbook',
      'betmgm',
    ] as const;

    try {
      const response = await this.client.get<unknown>('getNFLBettingOdds', {
        params: {
          gameID: params.tank01GameId,
          itemFormat: 'list',
        },
      });

      const data = tank01Response(
        z.object({
          sportsBooks: z
            .object({
              sportsBook: z.string(),
              odds: tank01GameOddsSchema.partial(),
            })
            .array(),
        }),
      ).parse(response.data);

      for (const preferredSportsBook of preferredSportsBooks) {
        const odds = data.body.sportsBooks.find(
          ({ sportsBook }) => sportsBook === preferredSportsBook,
        )?.odds;

        if (odds === undefined) continue;

        if (this.isCompleteOdds(odds)) return odds;
      }

      for (const sportsBook of data.body.sportsBooks) {
        if (this.isCompleteOdds(sportsBook.odds)) return sportsBook.odds;
      }

      throw new MissingOddsError(
        `No sportsbook provided complete odds for tank01 game ${params.tank01GameId}`,
      );
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        throw new Tank01ApiError(error.message, {
          cause: error,
          meta: params,
        });
      }

      if (error instanceof ZodError) {
        throw new Tank01SchemaError(error.message, {
          cause: error,
          meta: params,
        });
      }

      throw new Tank01Error('Unknown error occurred', {
        cause: error,
        meta: params,
      });
    }
  }

  public async getTeams(): Promise<Tank01Team[]> {
    try {
      const response = await this.client.get<unknown>('getNFLTeams');

      const { body } = tank01Response(tank01TeamSchema.array()).parse(
        response.data,
      );

      return body;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        throw new Tank01ApiError(error.message, {
          cause: error,
        });
      }

      if (error instanceof ZodError) {
        throw new Tank01SchemaError(error.message, {
          cause: error,
        });
      }

      throw new Tank01Error('Unknown error occurred', {
        cause: error,
      });
    }
  }
}
