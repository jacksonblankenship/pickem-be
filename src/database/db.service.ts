import { ConfigService } from '@/config/config.service';
import { drizzle } from 'drizzle-orm/postgres-js';
import { inject, injectable } from 'inversify';
import postgres from 'postgres';
import * as schema from './db.schema';
import { Database } from './db.types';

@injectable()
export class DatabaseService {
  private readonly client: postgres.Sql;
  private readonly db: Database;

  constructor(
    @inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const client = postgres(this.configService.getConfigValue('DATABASE_URL'), {
      prepare: false,
    });

    this.client = client;
    this.db = drizzle({ client: this.client, schema: schema });
  }

  public getDb() {
    return this.db;
  }

  public getClient() {
    return this.client;
  }
}
