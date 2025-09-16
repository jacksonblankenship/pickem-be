import { gameStatusEnum } from '@/database/db.schema';
import { BetOptionRepository } from '@/database/repositories/bet-option.repository';
import { GameRepository } from '@/database/repositories/game.repository';
import { TeamRepository } from '@/database/repositories/team.repository';
import { LoggerService } from '@/logger/logger.service';
import { Tank01GameStatusCode } from '@/tank01/tank01.schema';
import { Tank01Service } from '@/tank01/tank01.service';
import { epochToUtcDate } from '@/utils';
import { inject, injectable } from 'inversify';
import { GameDataSyncError } from './game-data-sync.errors';

@injectable()
export class GameDataSyncService {
  constructor(
    @inject(Tank01Service)
    private readonly tank01Service: Tank01Service,
    @inject(TeamRepository)
    private readonly teamRepository: TeamRepository,
    @inject(GameRepository)
    private readonly gameRepository: GameRepository,
    @inject(BetOptionRepository)
    private readonly betOptionRepository: BetOptionRepository,
    @inject(LoggerService)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Initializes a complete NFL season by fetching and storing all games for weeks 1-18.
   * @param params - Object containing the year to initialize
   * @param params.year - The NFL season year to initialize
   */
  public async importSeasonGames(params: { year: number }) {
    this.logger.info('Starting season games import', { year: params.year });

    try {
      for (let currentWeek = 1; currentWeek <= 18; currentWeek++) {
        this.logger.info('Importing games for week', {
          year: params.year,
          week: currentWeek,
        });

        const tank01Games = await this.tank01Service.getGames({
          year: params.year,
          week: currentWeek,
        });

        this.logger.info('Processing games for week', {
          year: params.year,
          week: currentWeek,
          gameCount: tank01Games.length,
        });

        for (const tank01Game of tank01Games) {
          const awayTeam = await this.teamRepository.getTeamByAbbr(
            tank01Game.away,
          );

          const homeTeam = await this.teamRepository.getTeamByAbbr(
            tank01Game.home,
          );

          await this.gameRepository.upsertGame({
            external_id: tank01Game.gameID,
            year: params.year,
            week: currentWeek,
            home_team_id: homeTeam.id,
            away_team_id: awayTeam.id,
          });
        }

        this.logger.info('Completed games import for week', {
          year: params.year,
          week: currentWeek,
          gameCount: tank01Games.length,
        });
      }

      this.logger.info('Successfully completed season games import', {
        year: params.year,
      });
    } catch (error) {
      this.logger.error('Failed to import season games', {
        error: error instanceof Error ? error.message : 'Unknown error',
        year: params.year,
      });
      throw new GameDataSyncError('Unknown error occurred', { cause: error });
    }
  }

  /**
   * Updates game data including scores, dates, and status for all games in a specific week.
   * @param params - Object containing the year and week to update
   * @param params.year - The NFL season year
   * @param params.week - The week number (1-18)
   */
  public async syncGameData(params: { year: number; week: number }) {
    this.logger.info('Starting game data sync', {
      year: params.year,
      week: params.week,
    });

    try {
      const dbGames = await this.gameRepository.getGames({
        year: params.year,
        week: params.week,
      });

      this.logger.info('Found games to sync', {
        year: params.year,
        week: params.week,
        gameCount: dbGames.length,
      });

      for (const dbGame of dbGames) {
        const tank01GameStatus = await this.tank01Service.getGameStatus({
          tank01GameId: dbGame.external_id,
        });

        await this.gameRepository.upsertGame({
          away_team_id: dbGame.away_team_id,
          home_team_id: dbGame.home_team_id,
          external_id: dbGame.external_id,
          year: dbGame.year,
          week: dbGame.week,
          home_team_score: tank01GameStatus.homePts,
          away_team_score: tank01GameStatus.awayPts,
          date: tank01GameStatus.gameTime_epoch
            ? epochToUtcDate(tank01GameStatus.gameTime_epoch)
            : null,
          game_status: this.tank01GameStatusCodeToGameStatus(
            tank01GameStatus.gameStatusCode,
          ),
        });
      }

      this.logger.info('Successfully completed game data sync', {
        year: params.year,
        week: params.week,
        gameCount: dbGames.length,
      });
    } catch (error) {
      this.logger.error('Failed to sync game data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        year: params.year,
        week: params.week,
      });
      throw new GameDataSyncError('Unknown error occurred', { cause: error });
    }
  }

  /**
   * Initializes betting odds for all games in a specific week, including spread and total bets.
   * @param params - Object containing the year and week to initialize odds for
   * @param params.year - The NFL season year
   * @param params.week - The week number (1-18)
   */
  public async importBettingOptions(params: { year: number; week: number }) {
    this.logger.info('Starting betting options import', {
      year: params.year,
      week: params.week,
    });

    try {
      const dbGames = await this.gameRepository.getGames({
        year: params.year,
        week: params.week,
      });

      this.logger.info('Found games for betting options import', {
        year: params.year,
        week: params.week,
        gameCount: dbGames.length,
      });

      for (const dbGame of dbGames) {
        const tank01GameOdds = await this.tank01Service.getGameOdds({
          tank01GameId: dbGame.external_id,
        });

        await Promise.all([
          this.betOptionRepository.insertBetOption({
            game_id: dbGame.id,
            line: tank01GameOdds.awayTeamSpread,
            odds: tank01GameOdds.awayTeamSpreadOdds,
            target: 'away',
            type: 'spread',
          }),

          this.betOptionRepository.insertBetOption({
            game_id: dbGame.id,
            line: tank01GameOdds.homeTeamSpread,
            odds: tank01GameOdds.homeTeamSpreadOdds,
            target: 'home',
            type: 'spread',
          }),

          this.betOptionRepository.insertBetOption({
            game_id: dbGame.id,
            line: tank01GameOdds.totalOver,
            odds: tank01GameOdds.totalOverOdds,
            target: 'over',
            type: 'total',
          }),

          this.betOptionRepository.insertBetOption({
            game_id: dbGame.id,
            line: tank01GameOdds.totalUnder,
            odds: tank01GameOdds.totalUnderOdds,
            target: 'under',
            type: 'total',
          }),
        ]);
      }

      this.logger.info('Successfully completed betting options import', {
        year: params.year,
        week: params.week,
        gameCount: dbGames.length,
      });
    } catch (error) {
      this.logger.error('Failed to import betting options', {
        error: error instanceof Error ? error.message : 'Unknown error',
        year: params.year,
        week: params.week,
      });
      throw new GameDataSyncError('Unknown error occurred', { cause: error });
    }
  }

  /**
   * Initializes all NFL teams by fetching team data from Tank01 and storing them in the database.
   */
  public async importTeams() {
    this.logger.info('Starting teams import');

    try {
      const tank01Teams = await this.tank01Service.getTeams();

      this.logger.info('Processing teams', { teamCount: tank01Teams.length });

      for (const tank01Team of tank01Teams) {
        await this.teamRepository.upsertTeam({
          abbr: tank01Team.teamAbv,
          name: tank01Team.teamName,
          conference: tank01Team.conference,
          conference_abbr: tank01Team.conferenceAbv,
          division: tank01Team.division,
        });
      }

      this.logger.info('Successfully completed teams import', {
        teamCount: tank01Teams.length,
      });
    } catch (error) {
      this.logger.error('Failed to import teams', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new GameDataSyncError('Unknown error occurred', { cause: error });
    }
  }

  private tank01GameStatusCodeToGameStatus(
    tank01GameStatusCode: Tank01GameStatusCode,
  ): (typeof gameStatusEnum)['enumValues'][number] {
    switch (tank01GameStatusCode) {
      case Tank01GameStatusCode.NotStarted:
        return 'not-started';
      case Tank01GameStatusCode.InProgress:
        return 'in-progress';
      case Tank01GameStatusCode.Completed:
        return 'completed';
      case Tank01GameStatusCode.Postponed:
        return 'postponed';
      case Tank01GameStatusCode.Suspended:
        return 'suspended';
      default:
        return 'not-started';
    }
  }
}
