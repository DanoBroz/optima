import { describe, expect, it } from 'vitest';
import { autoScheduleTasks } from './autoSchedule';
import type { CalendarEvent, Task } from '@/types/task';

let taskId = 0;
const baseTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${taskId++}`,
  title: 'Task',
  completed: false,
  duration: 30,
  priority: 'medium',
  energy_level: 'medium',
  motivation_level: 'neutral',
  is_locked: false,
  order_index: 0,
  scheduled_time: null,
  scheduled_date: null,
  ...overrides,
});

describe('autoScheduleTasks', () => {
  it('assigns tasks into available slots', () => {
    const tasks = [baseTask({ id: 'a' }), baseTask({ id: 'b' })];
    const events: CalendarEvent[] = [];

    const scheduled = autoScheduleTasks(
      tasks,
      events,
      '09:00',
      '12:00',
      'medium',
      '2024-01-01'
    );

    expect(scheduled).toHaveLength(2);
    expect(scheduled[0].scheduled_time).toBeTruthy();
  });

  it('skips slots blocked by events', () => {
    const tasks = [baseTask({ id: 'a', duration: 60 })];
    const events: CalendarEvent[] = [
      {
        id: 'event-1',
        title: 'Meeting',
        start_time: '2024-01-01T09:00:00',
        end_time: '2024-01-01T10:00:00',
        is_external: false,
      },
    ];

    const scheduled = autoScheduleTasks(
      tasks,
      events,
      '09:00',
      '12:00',
      'medium',
      '2024-01-01'
    );

    expect(scheduled[0].scheduled_time).toBe('10:00');
  });
});
