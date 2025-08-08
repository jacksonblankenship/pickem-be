import { injectable } from 'inversify';
import z from 'zod';
import { configSchema } from './config.schema';

@injectable()
export class ConfigService {
  private readonly config: z.infer<typeof configSchema>;

  constructor() {
    this.config = configSchema.parse(process.env);
  }

  public getConfigValue(key: keyof z.infer<typeof configSchema>) {
    return this.config[key];
  }
}
