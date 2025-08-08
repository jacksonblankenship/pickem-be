import { container } from './container';
import { GameDataSyncService } from './game-data-sync/game-data-sync.service';

(async () => {
  const service = container.get(GameDataSyncService);

  const games = await service.syncOdds({
    year: 2024,
    week: 3,
  });

  console.log(games);
})();
