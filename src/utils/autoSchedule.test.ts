import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  autoScheduleTasks,
  isTimeInPast,
  findNextAvailableSlot,
  autoScheduleSelectedTasks,
  autoScheduleBacklogTasks,
} from './autoSchedule';
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
  availability_preset: 'any',
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

describe('isTimeInPast', () => {
  beforeEach(() => {
    // Mock current time to 2024-01-15 10:30
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for past times on today', () => {
    expect(isTimeInPast('09:00', '2024-01-15')).toBe(true);
    expect(isTimeInPast('10:00', '2024-01-15')).toBe(true);
  });

  it('returns false for future times on today', () => {
    expect(isTimeInPast('11:00', '2024-01-15')).toBe(false);
    expect(isTimeInPast('14:00', '2024-01-15')).toBe(false);
  });

  it('returns false for any time on future dates', () => {
    expect(isTimeInPast('09:00', '2024-01-16')).toBe(false);
    expect(isTimeInPast('06:00', '2024-02-01')).toBe(false);
  });
});

describe('findNextAvailableSlot', () => {
  beforeEach(() => {
    // Mock current time to 2024-01-15 10:30
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('finds next available slot respecting current time', () => {
    const slot = findNextAvailableSlot('2024-01-15', 30, 'any', [], []);
    // Slots are in 15-min increments, 10:30 is the current time slot
    expect(slot).toBe('10:30');
  });

  it('finds slot respecting existing scheduled tasks', () => {
    const existingTasks = [
      baseTask({ id: 'existing', scheduled_time: '10:30', scheduled_date: '2024-01-15', duration: 30 }),
    ];
    const slot = findNextAvailableSlot('2024-01-15', 30, 'any', [], existingTasks);
    // 10:30-11:00 is occupied, so should find 11:00
    expect(slot).toBe('11:00');
  });

  it('returns null when no slots available', () => {
    // Mock time to late in the day
    vi.setSystemTime(new Date('2024-01-15T18:45:00'));
    const slot = findNextAvailableSlot('2024-01-15', 60, 'any', [], []);
    // Default work hours end at 19:00, so no 60-min slot available
    expect(slot).toBe(null);
  });
});

describe('autoScheduleSelectedTasks', () => {
  it('only schedules selected tasks', () => {
    const tasks = [
      baseTask({ id: 'a' }),
      baseTask({ id: 'b' }),
      baseTask({ id: 'c' }),
    ];

    const scheduled = autoScheduleSelectedTasks(
      tasks,
      ['a', 'c'], // Only select a and c
      [],
      '09:00',
      '12:00',
      'medium',
      '2024-01-01'
    );

    expect(scheduled).toHaveLength(2);
    expect(scheduled.map(t => t.id)).toContain('a');
    expect(scheduled.map(t => t.id)).toContain('c');
    expect(scheduled.map(t => t.id)).not.toContain('b');
  });

  it('skips locked tasks even if selected', () => {
    const tasks = [
      baseTask({ id: 'a' }),
      baseTask({ id: 'b', is_locked: true }),
    ];

    const scheduled = autoScheduleSelectedTasks(
      tasks,
      ['a', 'b'],
      [],
      '09:00',
      '12:00',
      'medium',
      '2024-01-01'
    );

    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].id).toBe('a');
  });

  it('preserves existing timeline tasks slots', () => {
    const existingScheduledTask = baseTask({
      id: 'existing',
      scheduled_time: '09:00',
      scheduled_date: '2024-01-01',
      duration: 60,
    });
    const newTask = baseTask({ id: 'new', duration: 30 });

    const scheduled = autoScheduleSelectedTasks(
      [existingScheduledTask, newTask],
      ['new'],
      [],
      '09:00',
      '12:00',
      'medium',
      '2024-01-01'
    );

    expect(scheduled).toHaveLength(1);
    // New task should be scheduled after the existing one (09:00-10:00)
    expect(scheduled[0].scheduled_time).toBe('10:00');
  });
});

describe('autoScheduleBacklogTasks', () => {
  it('schedules all unscheduled tasks', () => {
    const tasks = [
      baseTask({ id: 'a' }),
      baseTask({ id: 'b' }),
    ];

    const scheduled = autoScheduleBacklogTasks(
      tasks,
      [],
      '09:00',
      '12:00',
      'medium',
      '2024-01-01'
    );

    expect(scheduled).toHaveLength(2);
  });

  it('skips locked backlog tasks', () => {
    const tasks = [
      baseTask({ id: 'a' }),
      baseTask({ id: 'b', is_locked: true }),
    ];

    const scheduled = autoScheduleBacklogTasks(
      tasks,
      [],
      '09:00',
      '12:00',
      'medium',
      '2024-01-01'
    );

    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].id).toBe('a');
  });

  it('preserves existing scheduled tasks', () => {
    const existingScheduledTask = baseTask({
      id: 'existing',
      scheduled_time: '09:00',
      scheduled_date: '2024-01-01',
      duration: 60,
    });
    const backlogTask = baseTask({ id: 'backlog', duration: 30 });

    const scheduled = autoScheduleBacklogTasks(
      [existingScheduledTask, backlogTask],
      [],
      '09:00',
      '12:00',
      'medium',
      '2024-01-01'
    );

    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].id).toBe('backlog');
    // Backlog task should be scheduled after the existing one
    expect(scheduled[0].scheduled_time).toBe('10:00');
  });
});
