import { Container } from 'inversify';
import { CliService } from './cli/cli.service';
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

const container: Container = new Container();

const singletonServices = [
  BetOptionRepository,
  CliService,
  ConfigService,
  DatabaseService,
  GameDataSyncService,
  GameRepository,
  GradingService,
  LoggerService,
  PickRepository,
  Tank01Service,
  TeamRepository,
];

for (const service of singletonServices) {
  container.bind(service).toSelf().inSingletonScope();
}

export { container };
