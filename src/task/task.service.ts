import { GameDataSyncService } from '@/game-data-sync/game-data-sync.service';
import { GradingService } from '@/grading/grading.service';
import { LoggerService } from '@/logger/logger.service';
import { inject, injectable } from 'inversify';

@injectable()
export class TaskService {
  constructor(
    @inject(GameDataSyncService)
    private readonly gameDataSyncService: GameDataSyncService,
    @inject(GradingService)
    private readonly gradingService: GradingService,
    @inject(LoggerService)
    private readonly logger: LoggerService,
  ) {}

  public async prepareWeek(params: { year: number; week: number }) {
    this.logger.info('Starting week preparation', {
      year: params.year,
      week: params.week,
    });

    await this.gameDataSyncService.syncGameData(params);
    await this.gameDataSyncService.importBettingOptions(params);

    this.logger.info('Week preparation completed', {
      year: params.year,
      week: params.week,
    });
  }

  public async completeWeek(params: { year: number; week: number }) {
    this.logger.info('Starting week completion', {
      year: params.year,
      week: params.week,
    });

    await this.gameDataSyncService.syncGameData(params);
    await this.gradingService.gradeWeekPicks(params);

    this.logger.info('Week completion finished', {
      year: params.year,
      week: params.week,
    });
  }
}
