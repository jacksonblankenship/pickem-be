import { Container } from 'inversify';
import { ConfigService } from './config/config.service';
import { DatabaseService } from './database/db.service';
import { BetOptionRepository } from './database/repositories/bet-option.repository';
import { GameRepository } from './database/repositories/game.repository';
import { TeamRepository } from './database/repositories/team.repository';
import { GameDataSyncService } from './game-data-sync/game-data-sync.service';
import { Tank01Service } from './tank01/tank01.service';

const container: Container = new Container();

container.bind(ConfigService).toSelf();

container.bind(DatabaseService).toSelf();
container.bind(BetOptionRepository).toSelf();
container.bind(GameRepository).toSelf();
container.bind(TeamRepository).toSelf();

container.bind(GameDataSyncService).toSelf();

container.bind(Tank01Service).toSelf();

export { container };
