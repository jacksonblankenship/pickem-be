import { injectable } from 'inversify';
import z from 'zod';
import { configSchema } from './config.schema';

@injectable()
export class ConfigService {
  private readonly config: z.infer<typeof configSchema>;

  constructor() {
    this.config = configSchema.parse(process.env);
  }

  public getConfigValue<K extends keyof z.infer<typeof configSchema>>(
    key: K,
  ): z.infer<typeof configSchema>[K] {
    return this.config[key];
  }
}
