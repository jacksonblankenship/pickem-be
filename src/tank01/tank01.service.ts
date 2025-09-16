import { ConfigService } from '@/config/config.service';
import { LoggerService } from '@/logger/logger.service';
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
    @inject(LoggerService) private readonly logger: LoggerService,
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
    this.logger.info('Fetching games from Tank01 API', {
      week: params.week,
      year: params.year,
    });

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

      this.logger.info('Successfully fetched games', {
        count: body.length,
        week: params.week,
        year: params.year,
      });

      return body;
    } catch (error: unknown) {
      this.logger.error('Failed to fetch games from Tank01 API', {
        error: error instanceof Error ? error.message : 'Unknown error',
        week: params.week,
        year: params.year,
      });

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
    this.logger.info('Fetching game status from Tank01 API', {
      tank01GameId: params.tank01GameId,
    });

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

      this.logger.info('Successfully fetched game status', {
        tank01GameId: params.tank01GameId,
        status: body[params.tank01GameId]?.gameStatusCode,
      });

      return body[params.tank01GameId];
    } catch (error) {
      this.logger.error('Failed to fetch game status from Tank01 API', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tank01GameId: params.tank01GameId,
      });

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
    this.logger.info('Fetching game odds from Tank01 API', {
      tank01GameId: params.tank01GameId,
    });

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

      this.logger.info('Found sportsbooks with odds', {
        tank01GameId: params.tank01GameId,
        sportsbookCount: data.body.sportsBooks.length,
      });

      for (const preferredSportsBook of preferredSportsBooks) {
        const odds = data.body.sportsBooks.find(
          ({ sportsBook }) => sportsBook === preferredSportsBook,
        )?.odds;

        if (odds === undefined) continue;

        if (this.isCompleteOdds(odds)) {
          this.logger.info('Using odds from preferred sportsbook', {
            tank01GameId: params.tank01GameId,
            sportsbook: preferredSportsBook,
          });
          return odds;
        }
      }

      for (const sportsBook of data.body.sportsBooks) {
        if (this.isCompleteOdds(sportsBook.odds)) {
          this.logger.info('Using odds from fallback sportsbook', {
            tank01GameId: params.tank01GameId,
            sportsbook: sportsBook.sportsBook,
          });
          return sportsBook.odds;
        }
      }

      this.logger.error('No complete odds found for game', {
        tank01GameId: params.tank01GameId,
        availableSportsbooks: data.body.sportsBooks.map(sb => sb.sportsBook),
      });

      throw new MissingOddsError(
        `No sportsbook provided complete odds for tank01 game ${params.tank01GameId}`,
      );
    } catch (error: unknown) {
      this.logger.error('Failed to fetch game odds from Tank01 API', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tank01GameId: params.tank01GameId,
      });

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
    this.logger.info('Fetching teams from Tank01 API');

    try {
      const response = await this.client.get<unknown>('getNFLTeams');

      const { body } = tank01Response(tank01TeamSchema.array()).parse(
        response.data,
      );

      this.logger.info('Successfully fetched teams', { count: body.length });

      return body;
    } catch (error: unknown) {
      this.logger.error('Failed to fetch teams from Tank01 API', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

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
