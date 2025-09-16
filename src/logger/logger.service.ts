import { ConfigService } from '@/config/config.service';
import { inject, injectable } from 'inversify';
import pino from 'pino';

@injectable()
export class LoggerService {
  private readonly logger: pino.Logger;

  constructor(
    @inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.logger = pino({
      ...(this.configService.getConfigValue('CI') === false && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      }),
    });
  }

  public info(message: string, meta?: Record<string, unknown>) {
    this.logger.info(meta, message);
  }

  public error(message: string, meta?: Record<string, unknown>) {
    this.logger.error(meta, message);
  }
}
