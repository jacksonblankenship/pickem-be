import { container } from './container';
import { TaskService } from './task/task.service';

(async () => {
  const service = container.get(TaskService);

  await service.completeWeek({ year: 2024, week: 1 });

  console.log('Done');
})();
