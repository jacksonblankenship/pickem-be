import { CliService } from './cli/cli.service';
import { container } from './container';
import { DatabaseService } from './database/db.service';

(async () => {
  const cliService = container.get(CliService);
  const databaseService = container.get(DatabaseService);

  try {
    await cliService.run();
  } catch {
    process.exit(1);
  } finally {
    await databaseService.getClient().end();
  }
})();
