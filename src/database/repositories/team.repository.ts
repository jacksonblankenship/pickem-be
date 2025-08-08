import { DrizzleError, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { inject, injectable } from 'inversify';
import { TeamNotFoundError, TeamRepositoryError } from '../db.errors';
import { teamsTable } from '../db.schema';
import { DatabaseService } from '../db.service';

@injectable()
export class TeamRepository {
  private readonly db: PostgresJsDatabase;

  constructor(
    @inject(DatabaseService) private readonly databaseService: DatabaseService,
  ) {
    this.db = this.databaseService.getDb();
  }

  public async getTeamByAbbr(
    abbr: string,
  ): Promise<typeof teamsTable.$inferSelect> {
    try {
      const teams = await this.db
        .select()
        .from(teamsTable)
        .where(eq(teamsTable.abbr, abbr));

      if (teams.length === 0) {
        throw new TeamNotFoundError(`Team with abbr ${abbr} not found`, {
          meta: { abbr },
        });
      }

      return teams[0];
    } catch (error) {
      if (error instanceof DrizzleError) {
        throw new TeamRepositoryError(error.message, {
          cause: error,
          meta: { abbr },
        });
      }

      throw new TeamRepositoryError('Unknown error occurred', {
        cause: error,
        meta: { abbr },
      });
    }
  }
}
