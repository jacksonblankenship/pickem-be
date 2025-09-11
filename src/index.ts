import { container } from './container';
import { GameDataSyncService } from './game-data-sync/game-data-sync.service';

(async () => {
  const service = container.get(GameDataSyncService);

  await service.updateGameData({ year: 2025, week: 1 });
})();
