import {
  cancel,
  intro,
  isCancel,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts';
import z from 'zod';
import { container } from './container';
import { TaskService } from './task/task.service';

async function main() {
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
      const schema = z
        .transform(Number)
        .pipe(z.int().min(2020).max(2030))
        .safeParse(value);

      if (!schema.success) {
        return 'Please enter a valid year between 2020 and 2030.';
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
      const schema = z
        .transform(Number)
        .pipe(z.int().min(1).max(18))
        .safeParse(value);

      if (!schema.success) {
        return 'Please enter a valid week number between 1 and 18.';
      }

      return undefined;
    },
  });

  if (isCancel(week)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  const s = spinner();
  const yearNum = parseInt(year, 10);
  const weekNum = parseInt(week, 10);

  try {
    const taskService = container.get(TaskService);

    switch (action) {
      case 'prepare-week':
        s.start('Preparing week...');
        await taskService.prepareWeek({ year: yearNum, week: weekNum });
        s.stop('✅ Week preparation completed successfully');
        break;
      case 'daily-update':
        s.start('Running daily update...');
        await taskService.dailyUpdate({ year: yearNum, week: weekNum });
        s.stop('✅ Daily update completed successfully');
        break;
      case 'complete-week':
        s.start('Completing week...');
        await taskService.completeWeek({ year: yearNum, week: weekNum });
        s.stop('✅ Week completion finished successfully');
        break;
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
