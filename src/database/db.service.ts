import { ConfigService } from '@/config/config.service';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { inject, injectable } from 'inversify';
import postgres from 'postgres';

@injectable()
export class DatabaseService {
  private readonly client: postgres.Sql;
  private readonly db: PostgresJsDatabase;

  constructor(
    @inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const client = postgres(this.configService.getConfigValue('DATABASE_URL'), {
      prepare: false,
    });

    this.client = client;
    this.db = drizzle({ client: this.client });
  }

  public getDb() {
    return this.db;
  }

  public getClient() {
    return this.client;
  }
}
