import { DrizzleError } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { inject, injectable } from 'inversify';
import { BetOptionRepositoryError } from '../db.errors';
import { betOptionsTable } from '../db.schema';
import { DatabaseService } from '../db.service';

@injectable()
export class BetOptionRepository {
  private readonly db: PostgresJsDatabase;

  constructor(
    @inject(DatabaseService) private readonly databaseService: DatabaseService,
  ) {
    this.db = this.databaseService.getDb();
  }

  public async insertBetOption(params: typeof betOptionsTable.$inferInsert) {
    try {
      await this.db
        .insert(betOptionsTable)
        .values({
          game_id: params.game_id,
          line: params.line,
          odds: params.odds,
          target: params.target,
          type: params.type,
        })
        .onConflictDoNothing({
          target: [
            betOptionsTable.game_id,
            betOptionsTable.type,
            betOptionsTable.target,
          ],
        });
    } catch (error) {
      if (error instanceof DrizzleError) {
        throw new BetOptionRepositoryError(error.message, {
          cause: error,
          meta: params,
        });
      }

      throw new BetOptionRepositoryError('Unknown error occurred', {
        cause: error,
        meta: params,
      });
    }
  }
}
