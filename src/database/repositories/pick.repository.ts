import { and, DrizzleError, eq } from 'drizzle-orm';
import { inject, injectable } from 'inversify';
import { PickRepositoryError } from '../db.errors';
import { betOptionsTable, gamesTable, picksTable } from '../db.schema';
import { DatabaseService } from '../db.service';
import { Database } from '../db.types';

@injectable()
export class PickRepository {
  private readonly db: Database;

  constructor(
    @inject(DatabaseService) private readonly databaseService: DatabaseService,
  ) {
    this.db = this.databaseService.getDb();
  }

  public async updatePickStatus(params: {
    pickId: number;
    status: 'won' | 'lost' | 'push';
  }) {
    try {
      await this.db
        .update(picksTable)
        .set({ status: params.status })
        .where(eq(picksTable.id, params.pickId));
    } catch (error) {
      if (error instanceof DrizzleError) {
        throw new PickRepositoryError(error.message, { cause: error });
      }

      throw new PickRepositoryError('Unknown error occurred', { cause: error });
    }
  }

  public async getAllPicksWithGameScores(params: {
    year: number;
    week: number;
  }) {
    try {
      const result = await this.db
        .select()
        .from(picksTable)
        .leftJoin(
          betOptionsTable,
          eq(picksTable.bet_option_id, betOptionsTable.id),
        )
        .leftJoin(gamesTable, eq(betOptionsTable.game_id, gamesTable.id))
        .where(
          and(
            eq(gamesTable.year, params.year),
            eq(gamesTable.week, params.week),
          ),
        );

      return result;
    } catch (error) {
      if (error instanceof DrizzleError) {
        throw new PickRepositoryError(error.message, {
          cause: error,
        });
      }

      throw new PickRepositoryError('Unknown error occurred', {
        cause: error,
      });
    }
  }
}
