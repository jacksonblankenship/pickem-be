import { BetOptionRepository } from '@/database/repositories/bet-option.repository';
import { GameRepository } from '@/database/repositories/game.repository';
import { TeamRepository } from '@/database/repositories/team.repository';
import { Tank01Service } from '@/tank01/tank01.service';
import { epochToUtcDate } from '@/utils';
import { inject, injectable } from 'inversify';

@injectable()
export class GameDataSyncService {
  constructor(
    @inject(Tank01Service) private readonly tank01Service: Tank01Service,
    @inject(TeamRepository) private readonly teamRepository: TeamRepository,
    @inject(GameRepository) private readonly gameRepository: GameRepository,
    @inject(BetOptionRepository)
    private readonly betOptionRepository: BetOptionRepository,
  ) {}

  public async syncGames(params: { year: number }) {
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
          date: epochToUtcDate(tank01Game.gameTime_epoch),
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
        });
      }
    }
  }

  public async syncOdds(params: { year: number; week: number }) {
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
  }
}
