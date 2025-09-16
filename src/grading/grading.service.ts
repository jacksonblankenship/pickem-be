import { PickRepository } from '@/database/repositories/pick.repository';
import { LoggerService } from '@/logger/logger.service';
import { inject, injectable } from 'inversify';
import {
  GameNotCompletedError,
  GradingError,
  MissingBetOptionError,
  MissingGameError,
} from './grading.errors';

@injectable()
export class GradingService {
  constructor(
    @inject(PickRepository)
    private readonly pickRepository: PickRepository,
    @inject(LoggerService)
    private readonly logger: LoggerService,
  ) {}

  public async gradeWeekPicks(params: { year: number; week: number }) {
    this.logger.info('Starting week picks grading', {
      year: params.year,
      week: params.week,
    });

    try {
      const records = await this.pickRepository.getAllPicksWithGameScores({
        year: params.year,
        week: params.week,
      });

      this.logger.info('Found picks to grade', {
        year: params.year,
        week: params.week,
        pickCount: records.length,
      });

      for (const record of records) {
        if (record.bet_options === null)
          throw new MissingBetOptionError('Missing bet option', {
            meta: record,
          });

        if (record.games === null)
          throw new MissingGameError('Missing game', { meta: record });

        if (record.games.game_status !== 'completed')
          throw new GameNotCompletedError('Game not completed', {
            meta: record,
          });

        const betOption = record.bet_options;
        const game = record.games;
        const pick = record.picks;

        const pickStatus =
          betOption.type === 'spread'
            ? this.gradeSpreadPick({
                line: betOption.line,
                target: betOption.target as 'home' | 'away',
                homeScore: game.home_team_score,
                awayScore: game.away_team_score,
              })
            : this.gradeTotalPick({
                line: betOption.line,
                target: betOption.target as 'over' | 'under',
                homeScore: game.home_team_score,
                awayScore: game.away_team_score,
              });

        await this.pickRepository.updatePickStatus({
          pickId: pick.id,
          status: pickStatus,
        });
      }

      this.logger.info('Completed week picks grading', {
        year: params.year,
        week: params.week,
        totalCount: records.length,
      });
    } catch (error) {
      this.logger.error('Failed to grade week picks', {
        error: error instanceof Error ? error.message : 'Unknown error',
        year: params.year,
        week: params.week,
      });
      throw new GradingError('Unknown error occurred', { cause: error });
    }
  }

  private gradeSpreadPick(params: {
    line: number;
    target: 'home' | 'away';
    homeScore: number;
    awayScore: number;
  }): 'won' | 'lost' | 'push' {
    const targetScore =
      params.target === 'home' ? params.homeScore : params.awayScore;

    const opposingScore =
      params.target === 'home' ? params.awayScore : params.homeScore;

    const netScore = targetScore + params.line;

    if (netScore > opposingScore) {
      return 'won';
    } else if (netScore < opposingScore) {
      return 'lost';
    }

    return 'push';
  }

  private gradeTotalPick(params: {
    line: number;
    target: 'over' | 'under';
    homeScore: number;
    awayScore: number;
  }): 'won' | 'lost' | 'push' {
    const pointTotal = params.homeScore + params.awayScore;

    if (pointTotal > params.line && params.target === 'over') {
      return 'won';
    }

    if (pointTotal < params.line && params.target === 'under') {
      return 'won';
    }

    if (pointTotal === params.line) {
      return 'push';
    }

    return 'lost';
  }
}
