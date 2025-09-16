import { Command } from 'commander';
import z from 'zod';
import { container } from './container';
import { DatabaseService } from './database/db.service';
import { LoggerService } from './logger/logger.service';
import { TaskService } from './task/task.service';

const program = new Command();

program
  .name('pickem-cli')
  .description('🏈 Pickem Backend Task Management CLI')
  .version('1.0.0');

function validateYear(value: unknown): number {
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

function validateWeek(value: unknown): number {
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

program
  .command('prepare-week')
  .description(
    'Initialize a new week by syncing the latest game data from external APIs and importing all available betting options. This command should be run at the beginning of each week to set up the pickem system for the upcoming games.',
  )
  .requiredOption(
    '-y, --year <year>',
    'NFL season year (e.g., 2024). Must be a valid integer.',
    validateYear,
  )
  .requiredOption(
    '-w, --week <week>',
    'Week number (1-18). All weeks are regular season.',
    validateWeek,
  )
  .action(async options => {
    const taskService = container.get(TaskService);

    await taskService.prepareWeek({
      year: options.year,
      week: options.week,
    });
  });

program
  .command('daily-update')
  .description(
    'Update game data with the latest information from external APIs. This command should be run daily during the season to ensure all game details, scores, and statuses are current. Useful for tracking live game updates and final scores.',
  )
  .requiredOption(
    '-y, --year <year>',
    'NFL season year (e.g., 2024). Must be a valid integer.',
    validateYear,
  )
  .requiredOption(
    '-w, --week <week>',
    'Week number (1-18). All weeks are regular season.',
    validateWeek,
  )
  .action(async options => {
    const taskService = container.get(TaskService);

    await taskService.dailyUpdate({
      year: options.year,
      week: options.week,
    });
  });

program
  .command('complete-week')
  .description(
    'Finalize a week by syncing the latest game data and automatically grading all user picks based on final scores and outcomes. This command should be run after all games in a week have concluded to calculate user scores and update standings.',
  )
  .requiredOption(
    '-y, --year <year>',
    'NFL season year (e.g., 2024). Must be a valid integer.',
    validateYear,
  )
  .requiredOption(
    '-w, --week <week>',
    'Week number (1-18). All weeks are regular season.',
    validateWeek,
  )
  .action(async options => {
    const taskService = container.get(TaskService);

    await taskService.completeWeek({
      year: options.year,
      week: options.week,
    });
  });

(async () => {
  try {
    if (process.argv.length === 2) {
      program.help();
      return;
    }

    await program.parseAsync();
  } catch (error) {
    const logger = container.get(LoggerService);
    logger.error('CLI execution failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    // Only close database connection if it was actually used
    try {
      const dbService = container.get(DatabaseService);
      dbService.getClient().end();
    } catch {
      // Database service might not have been instantiated if only help was shown
    }
    process.exit(0);
  }
})();
