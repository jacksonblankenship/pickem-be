import { and, DrizzleError, eq, SQL } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { inject, injectable } from 'inversify';
import {
  DatabaseError,
  DatabaseNotFoundError,
  UnknownDatabaseError,
} from '../db.errors';
import { gamesTable } from '../db.schema';
import { DatabaseService } from '../db.service';

@injectable()
export class GameRepository {
  private readonly db: PostgresJsDatabase;

  constructor(
    @inject(DatabaseService) private readonly databaseService: DatabaseService,
  ) {
    this.db = this.databaseService.getDb();
  }

  public async getGame(id: number): Promise<typeof gamesTable.$inferSelect> {
    try {
      const games = await this.db
        .select()
        .from(gamesTable)
        .where(eq(gamesTable.id, id))
        .limit(1);

      if (games.length === 0) {
        throw new DatabaseNotFoundError(`Game with id ${id} not found`);
      }

      return games[0];
    } catch (error) {
      if (error instanceof DrizzleError) {
        throw new DatabaseError(error.message, error);
      }

      throw new UnknownDatabaseError(error);
    }
  }

  public async getGames(params?: {
    year?: number;
    week?: number;
  }): Promise<Array<typeof gamesTable.$inferSelect>> {
    try {
      const conditions: Array<SQL> = [];

      if (params?.year !== undefined) {
        conditions.push(eq(gamesTable.year, params.year));
      }
      if (params?.week !== undefined) {
        conditions.push(eq(gamesTable.week, params.week));
      }

      return this.db
        .select()
        .from(gamesTable)
        .where(and(...conditions));
    } catch (error) {
      if (error instanceof DrizzleError) {
        throw new DatabaseError(error.message, error);
      }

      throw new UnknownDatabaseError(error);
    }
  }

  public async upsertGame(params: typeof gamesTable.$inferInsert) {
    try {
      await this.db
        .insert(gamesTable)
        .values(params)
        .onConflictDoUpdate({
          target: [
            gamesTable.year,
            gamesTable.week,
            gamesTable.home_team_id,
            gamesTable.away_team_id,
          ],
          set: params,
        });
    } catch (error) {
      if (error instanceof DrizzleError) {
        throw new DatabaseError(error.message, error);
      }

      throw new UnknownDatabaseError(error);
    }
  }
}
