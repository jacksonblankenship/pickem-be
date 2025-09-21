import { GameDataSyncService } from '@/game-data-sync/game-data-sync.service';
import { GradingService } from '@/grading/grading.service';
import { LoggerService } from '@/logger/logger.service';
import { Command } from 'commander';
import { inject, injectable } from 'inversify';
import z from 'zod';

@injectable()
export class CliService {
  private program: Command;

  constructor(
    @inject(GameDataSyncService)
    private readonly gameDataSyncService: GameDataSyncService,
    @inject(GradingService)
    private readonly gradingService: GradingService,
    @inject(LoggerService)
    private readonly logger: LoggerService,
  ) {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands() {
    this.program
      .command('sync-teams')
      .description(
        'Sync all NFL teams by fetching and upserting team data from Tank01 API. This command updates team information including names, conferences, and divisions. It is idempotent - safe to run multiple times. Use this to initialize team data or update existing team information.',
      )
      .action(async () => {
        await this.gameDataSyncService.syncTeams();
      });

    this.program
      .command('sync-season')
      .description(
        'Sync all NFL season games by fetching and upserting game data from Tank01 API. This command updates game information including dates, times, and statuses. It is idempotent - safe to run multiple times. Use this to initialize season game data or update existing game information.',
      )
      .requiredOption(
        '-y, --year <year>',
        'NFL season year (e.g., 2025). Must be a valid integer.',
        this.validateYear,
      )
      .action(async (options: { year: number }) => {
        await this.gameDataSyncService.syncSeasonGames({
          year: options.year,
        });
      });

    this.program
      .command('update-games')
      .description(
        'Update game metadata only - syncs game information (scores, statuses, times) from external APIs without affecting betting options or user picks. Use this for live game updates or refreshing general game data during the week.',
      )
      .requiredOption(
        '-y, --year <year>',
        'NFL season year (e.g., 2025). Must be a valid integer.',
        this.validateYear,
      )
      .requiredOption(
        '-w, --week <week>',
        'Week number (1-18). All weeks are regular season.',
        this.validateWeek,
      )
      .action(async (options: { year: number; week: number }) => {
        await this.gameDataSyncService.syncGameData({
          year: options.year,
          week: options.week,
        });
      });

    this.program
      .command('setup-betting')
      .description(
        'Set up a new week for betting - syncs game metadata AND imports all available betting options for the week. Run this at the start of each week to enable users to make picks on upcoming games.',
      )
      .requiredOption(
        '-y, --year <year>',
        'NFL season year (e.g., 2025). Must be a valid integer.',
        this.validateYear,
      )
      .requiredOption(
        '-w, --week <week>',
        'Week number (1-18). All weeks are regular season.',
        this.validateWeek,
      )
      .action(async (options: { year: number; week: number }) => {
        await this.gameDataSyncService.syncGameData({
          year: options.year,
          week: options.week,
        });
        await this.gameDataSyncService.createBettingOptions({
          year: options.year,
          week: options.week,
        });
      });

    this.program
      .command('grade-picks')
      .description(
        'Finish a week and grade picks - syncs final game metadata AND grades all user picks as won/lost/pushed based on final outcomes. Run this after all games in a week have concluded to calculate scores and update standings.',
      )
      .requiredOption(
        '-y, --year <year>',
        'NFL season year (e.g., 2025). Must be a valid integer.',
        this.validateYear,
      )
      .requiredOption(
        '-w, --week <week>',
        'Week number (1-18). All weeks are regular season.',
        this.validateWeek,
      )
      .action(async (options: { year: number; week: number }) => {
        await this.gameDataSyncService.syncGameData({
          year: options.year,
          week: options.week,
        });
        await this.gradingService.gradeWeekPicks({
          year: options.year,
          week: options.week,
        });
      });
  }

  private validateYear(value: unknown): number {
    const result = z
      .transform(Number)
      .pipe(z.int().min(2000).max(2030))
      .safeParse(value);

    if (result.success === false)
      throw new Error(
        `Invalid year: ${value}. Must be an integer between 2000 and 2030.`,
      );

    return result.data;
  }

  private validateWeek(value: unknown): number {
    const result = z
      .transform(Number)
      .pipe(z.int().min(1).max(18))
      .safeParse(value);

    if (result.success === false)
      throw new Error(
        `Invalid week: ${value}. Must be an integer between 1 and 18.`,
      );

    return result.data;
  }

  public async run(): Promise<void> {
    try {
      if (process.argv.length === 2) {
        return this.program.help();
      }

      await this.program.parseAsync();
    } catch (error) {
      this.logger.error('CLI execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }
}
