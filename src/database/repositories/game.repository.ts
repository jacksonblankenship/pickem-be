import { and, DrizzleError, eq, SQL } from 'drizzle-orm';
import { inject, injectable } from 'inversify';
import { GameNotFoundError, GameRepositoryError } from '../db.errors';
import { gamesTable } from '../db.schema';
import { DatabaseService } from '../db.service';
import { Database } from '../db.types';

@injectable()
export class GameRepository {
  private readonly db: Database;

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
        throw new GameNotFoundError('Game not found', {
          meta: { id },
        });
      }

      return games[0];
    } catch (error) {
      if (error instanceof DrizzleError) {
        throw new GameRepositoryError(error.message, {
          cause: error,
          meta: { id },
        });
      }

      throw new GameRepositoryError('Unknown error occurred', {
        cause: error,
        meta: { id },
      });
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
        throw new GameRepositoryError(error.message, {
          cause: error,
          meta: params,
        });
      }

      throw new GameRepositoryError('Unknown error occurred', {
        cause: error,
        meta: params,
      });
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
          set: {
            date: params.date,
            game_status: params.game_status,
            neutral_site: params.neutral_site,
            away_team_score: params.away_team_score,
            home_team_score: params.home_team_score,
          },
        });
    } catch (error) {
      if (error instanceof DrizzleError) {
        throw new GameRepositoryError(error.message, {
          cause: error,
          meta: params,
        });
      }

      throw new GameRepositoryError('Unknown error occurred', {
        cause: error,
        meta: params,
      });
    }
  }
}
