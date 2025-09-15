import {
  cancel,
  intro,
  isCancel,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts';
import { Command } from 'commander';
import z from 'zod';
import { container } from './container';
import { TaskService } from './task/task.service';

const program = new Command();

program
  .name('pickem-cli')
  .description('🏈 Pickem Backend Task Management CLI')
  .version('1.0.0');

const yearSchema = z
  .transform(Number)
  .pipe(
    z
      .int({ error: 'Year must be an integer' })
      .min(2020, { error: 'Year must be greater than 2020' })
      .max(2030, { error: 'Year must be less than 2030' }),
  );

const weekSchema = z
  .transform(Number)
  .pipe(
    z
      .int({ error: 'Week must be an integer' })
      .min(1, { error: 'Week must be greater than 1' })
      .max(18, { error: 'Week must be less than 18' }),
  );

function validateYear(value: unknown) {
  const result = yearSchema.safeParse(value);

  if (result.success === false) {
    const [{ message }] = result.error.issues;
    throw new Error(message);
  }

  return undefined;
}

function validateWeek(value: unknown) {
  const result = weekSchema.safeParse(value);

  if (result.success === false) {
    const [{ message }] = result.error.issues;
    throw new Error(message);
  }

  return undefined;
}

async function interactiveMode() {
  intro('🏈 Pickem Backend Task Management CLI');

  const action = await select({
    message: 'Choose an action:',
    options: [
      {
        value: 'prepare-week',
        label: 'Prepare Week',
        hint: 'Sync game data and import betting options',
      },
      {
        value: 'daily-update',
        label: 'Daily Update',
        hint: 'Sync game data for daily updates',
      },
      {
        value: 'complete-week',
        label: 'Complete Week',
        hint: 'Sync game data and grade picks',
      },
    ],
  });

  if (isCancel(action)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  const year = await text({
    message: 'Enter the year:',
    placeholder: new Date().getFullYear().toString(),
    validate: value => {
      const result = yearSchema.safeParse(value);

      if (result.success === false) {
        const [{ message }] = result.error.issues;
        return message;
      }

      return undefined;
    },
  });

  if (isCancel(year)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  const week = await text({
    message: 'Enter the week number:',
    placeholder: '1',
    validate: value => {
      const result = weekSchema.safeParse(value);

      if (result.success === false) {
        const [{ message }] = result.error.issues;
        return message;
      }

      return undefined;
    },
  });

  if (isCancel(week)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  return {
    action: action,
    year: parseInt(year, 10),
    week: parseInt(week, 10),
  };
}

// Add commands for each action
program
  .command('prepare-week')
  .description(
    'Prepare a week by syncing game data and importing betting options',
  )
  .requiredOption('-y, --year <year>', 'Year (2020-2030)', validateYear)
  .requiredOption('-w, --week <week>', 'Week number (1-18)', validateWeek)
  .action(async options => {
    await executeTask('prepare-week', options.year, options.week);
  });

program
  .command('daily-update')
  .description('Perform daily update by syncing game data')
  .requiredOption('-y, --year <year>', 'Year (2020-2030)', validateYear)
  .requiredOption('-w, --week <week>', 'Week number (1-18)', validateWeek)
  .action(async options => {
    await executeTask('daily-update', options.year, options.week);
  });

program
  .command('complete-week')
  .description('Complete a week by syncing game data and grading picks')
  .requiredOption('-y, --year <year>', 'Year (2020-2030)', validateYear)
  .requiredOption('-w, --week <week>', 'Week number (1-18)', validateWeek)
  .action(async options => {
    await executeTask('complete-week', options.year, options.week);
  });

// Interactive mode when no command is provided
program
  .command('interactive', { isDefault: true })
  .description('Run in interactive mode')
  .action(async () => {
    const params = await interactiveMode();
    await executeTask(params.action, params.year, params.week);
  });

async function main() {
  // If no arguments provided, show help
  if (process.argv.length === 2) {
    program.help();
    return;
  }

  try {
    await program.parseAsync();
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function executeTask(action: string, year: number, week: number) {
  const s = spinner();

  try {
    const taskService = container.get(TaskService);

    switch (action) {
      case 'prepare-week':
        s.start('Preparing week...');
        await taskService.prepareWeek({ year, week });
        s.stop('✅ Week preparation completed successfully');
        break;
      case 'daily-update':
        s.start('Running daily update...');
        await taskService.dailyUpdate({ year, week });
        s.stop('✅ Daily update completed successfully');
        break;
      case 'complete-week':
        s.start('Completing week...');
        await taskService.completeWeek({ year, week });
        s.stop('✅ Week completion finished successfully');
        break;
      default:
        console.error('❌ Error: Unknown action:', action);
        process.exit(1);
    }
  } catch (error) {
    s.stop('❌ Operation failed');
    console.error('Error details:', error);
    process.exit(1);
  }

  outro('Thank you for using the Pickem CLI! 🏈');
  process.exit(0);
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
