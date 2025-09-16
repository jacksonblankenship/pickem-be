import { Container } from 'inversify';
import { ConfigService } from './config/config.service';
import { DatabaseService } from './database/db.service';
import { BetOptionRepository } from './database/repositories/bet-option.repository';
import { GameRepository } from './database/repositories/game.repository';
import { PickRepository } from './database/repositories/pick.repository';
import { TeamRepository } from './database/repositories/team.repository';
import { GameDataSyncService } from './game-data-sync/game-data-sync.service';
import { GradingService } from './grading/grading.service';
import { LoggerService } from './logger/logger.service';
import { Tank01Service } from './tank01/tank01.service';
import { TaskService } from './task/task.service';

const container: Container = new Container();

container.bind(ConfigService).toSelf().inSingletonScope();
container.bind(LoggerService).toSelf().inSingletonScope();

container.bind(DatabaseService).toSelf().inSingletonScope();
container.bind(BetOptionRepository).toSelf().inSingletonScope();
container.bind(GameRepository).toSelf().inSingletonScope();
container.bind(TeamRepository).toSelf().inSingletonScope();
container.bind(PickRepository).toSelf().inSingletonScope();

container.bind(GameDataSyncService).toSelf().inSingletonScope();

container.bind(GradingService).toSelf().inSingletonScope();

container.bind(TaskService).toSelf().inSingletonScope();

container.bind(Tank01Service).toSelf().inSingletonScope();

export { container };
