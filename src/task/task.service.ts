import { GameDataSyncService } from '@/game-data-sync/game-data-sync.service';
import { GradingService } from '@/grading/grading.service';
import { inject, injectable } from 'inversify';
import { TaskError } from './task.errors';

@injectable()
export class TaskService {
  constructor(
    @inject(GameDataSyncService)
    private readonly gameDataSyncService: GameDataSyncService,
    @inject(GradingService)
    private readonly gradingService: GradingService,
  ) {}

  public async prepareWeek(params: { year: number; week: number }) {
    try {
      await this.gameDataSyncService.syncGameData({
        year: params.year,
        week: params.week,
      });

      await this.gameDataSyncService.importBettingOptions({
        year: params.year,
        week: params.week,
      });
    } catch (error) {
      throw new TaskError('Unknown error occurred', { cause: error });
    }
  }

  public async dailyUpdate(params: { year: number; week: number }) {
    try {
      await this.gameDataSyncService.syncGameData({
        year: params.year,
        week: params.week,
      });
    } catch (error) {
      throw new TaskError('Unknown error occurred', { cause: error });
    }
  }

  public async completeWeek(params: { year: number; week: number }) {
    try {
      await this.gameDataSyncService.syncGameData({
        year: params.year,
        week: params.week,
      });

      await this.gradingService.gradeWeekPicks({
        year: params.year,
        week: params.week,
      });
    } catch (error) {
      throw new TaskError('Unknown error occurred', { cause: error });
    }
  }
}
