import { Tank01Service } from '@/tank01/tank01.service';
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
    @inject(Tank01Service) private readonly tank01Service: Tank01Service,
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

  public async upsertTeams() {
    try {
      const tank01Teams = await this.tank01Service.getTeams();

      for (const tank01Team of tank01Teams) {
        const values = {
          name: tank01Team.teamName,
          conference: tank01Team.conference,
          conference_abbr: tank01Team.conferenceAbv,
          division: tank01Team.division,
        };

        await this.db
          .insert(teamsTable)
          .values({
            abbr: tank01Team.teamAbv,
            ...values,
          })
          .onConflictDoUpdate({
            target: [teamsTable.abbr],
            set: values,
          });
      }
    } catch (error) {
      if (error instanceof DrizzleError) {
        throw new TeamRepositoryError(error.message, {
          cause: error,
        });
      }

      throw new TeamRepositoryError('Unknown error occurred', {
        cause: error,
      });
    }
  }
}
