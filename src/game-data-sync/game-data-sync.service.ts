import { gameStatusEnum } from '@/database/db.schema';
import { BetOptionRepository } from '@/database/repositories/bet-option.repository';
import { GameRepository } from '@/database/repositories/game.repository';
import { TeamRepository } from '@/database/repositories/team.repository';
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
  ) {}

  /**
   * Initializes a complete NFL season by fetching and storing all games for weeks 1-18.
   * @param params - Object containing the year to initialize
   * @param params.year - The NFL season year to initialize
   */
  public async importSeasonGames(params: { year: number }) {
    try {
      for (let currentWeek = 1; currentWeek <= 18; currentWeek++) {
        const tank01Games = await this.tank01Service.getGames({
          year: params.year,
          week: currentWeek,
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
      }
    } catch (error) {
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
    try {
      const dbGames = await this.gameRepository.getGames({
        year: params.year,
        week: params.week,
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
    } catch (error) {
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
    try {
      const dbGames = await this.gameRepository.getGames({
        year: params.year,
        week: params.week,
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
    } catch (error) {
      throw new GameDataSyncError('Unknown error occurred', { cause: error });
    }
  }

  /**
   * Initializes all NFL teams by fetching team data from Tank01 and storing them in the database.
   */
  public async importTeams() {
    try {
      const tank01Teams = await this.tank01Service.getTeams();

      for (const tank01Team of tank01Teams) {
        await this.teamRepository.upsertTeam({
          abbr: tank01Team.teamAbv,
          name: tank01Team.teamName,
          conference: tank01Team.conference,
          conference_abbr: tank01Team.conferenceAbv,
          division: tank01Team.division,
        });
      }
    } catch (error) {
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
