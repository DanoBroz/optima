/**
 * Centralized test data factories.
 *
 * Usage:
 *   import { createTask, createEvent, createEnergy } from '@/test/factories';
 *
 *   const task = createTask({ title: 'Custom title' });
 *   const completedTask = createTask({ completed: true });
 *
 * All factories:
 * - Generate unique IDs automatically
 * - Provide sensible defaults
 * - Accept partial overrides via spread
 */

import type {
  Task,
  CalendarEvent,
  DailyEnergy,
  DayCapacity,
  UserSettings,
  SyncChange,
  DailyEnergyLevel,
  DayIntention,
} from '@/types/task';

// ─────────────────────────────────────────────────────────────────────────────
// ID Generators
// ─────────────────────────────────────────────────────────────────────────────

let taskIdCounter = 0;
let eventIdCounter = 0;
let energyIdCounter = 0;

/** Reset all ID counters (call in beforeEach for test isolation) */
export const resetFactoryCounters = () => {
  taskIdCounter = 0;
  eventIdCounter = 0;
  energyIdCounter = 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// Task Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a Task with sensible defaults.
 *
 * @example
 * // Basic task
 * const task = createTask();
 *
 * // Scheduled task
 * const scheduled = createTask({
 *   scheduled_time: '09:00',
 *   scheduled_date: '2024-01-15',
 * });
 *
 * // High priority completed task
 * const done = createTask({ priority: 'high', completed: true });
 */
export const createTask = (overrides: Partial<Task> = {}): Task => {
  const id = overrides.id ?? `task-${++taskIdCounter}`;
  const now = new Date().toISOString();

  return {
    id,
    user_id: 'test-user-1',
    title: `Task ${taskIdCounter}`,
    description: null,
    completed: false,
    scheduled_time: null,
    scheduled_date: null,
    duration: 30,
    priority: 'medium',
    energy_level: 'medium',
    motivation_level: 'neutral',
    availability_windows: [],
    is_locked: false,
    order_index: taskIdCounter,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
};

/**
 * Creates a scheduled task (on timeline).
 */
export const createScheduledTask = (
  time: string,
  date: string,
  overrides: Partial<Task> = {}
): Task => {
  return createTask({
    scheduled_time: time,
    scheduled_date: date,
    ...overrides,
  });
};

/**
 * Creates a backlog task (no scheduled time).
 */
export const createBacklogTask = (overrides: Partial<Task> = {}): Task => {
  return createTask({
    scheduled_time: null,
    scheduled_date: null,
    ...overrides,
  });
};

/**
 * Creates a locked task (won't be moved by auto-scheduler).
 */
export const createLockedTask = (
  time: string,
  date: string,
  overrides: Partial<Task> = {}
): Task => {
  return createTask({
    scheduled_time: time,
    scheduled_date: date,
    is_locked: true,
    ...overrides,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// CalendarEvent Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a CalendarEvent with sensible defaults.
 *
 * @example
 * // Basic 1-hour event
 * const event = createEvent();
 *
 * // External synced event
 * const synced = createEvent({
 *   is_external: true,
 *   external_id: 'google-123',
 *   calendar_source: 'google',
 * });
 *
 * // High-energy draining meeting
 * const meeting = createEvent({
 *   title: 'Board Meeting',
 *   energy_level: 'high',
 * });
 */
export const createEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => {
  const id = overrides.id ?? `event-${++eventIdCounter}`;
  const now = new Date().toISOString();

  // Default: 1-hour event starting at 10:00 on 2024-01-15
  const defaultStart = '2024-01-15T10:00:00Z';
  const defaultEnd = '2024-01-15T11:00:00Z';

  return {
    id,
    user_id: 'test-user-1',
    title: `Event ${eventIdCounter}`,
    start_time: defaultStart,
    end_time: defaultEnd,
    is_external: false,
    external_id: null,
    calendar_source: null,
    location: null,
    energy_level: 'medium',
    energy_drain: null,
    is_dismissed: false,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
};

/**
 * Creates an event with specific start/end times.
 *
 * @param startTime - ISO string or time like '09:00'
 * @param endTime - ISO string or time like '10:00'
 * @param date - Date in YYYY-MM-DD format (defaults to '2024-01-15')
 */
export const createEventAt = (
  startTime: string,
  endTime: string,
  date = '2024-01-15',
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => {
  // If times are in HH:MM format, convert to ISO
  const toISO = (time: string, baseDate: string) => {
    if (time.includes('T')) return time;
    return `${baseDate}T${time}:00Z`;
  };

  return createEvent({
    start_time: toISO(startTime, date),
    end_time: toISO(endTime, date),
    ...overrides,
  });
};

/**
 * Creates an external (synced) calendar event.
 */
export const createExternalEvent = (
  externalId: string,
  source = 'google',
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => {
  return createEvent({
    is_external: true,
    external_id: externalId,
    calendar_source: source,
    ...overrides,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// DailyEnergy Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a DailyEnergy record.
 *
 * @example
 * const energy = createEnergy('2024-01-15', 'high');
 * const exhausted = createEnergy('2024-01-15', 'exhausted', { notes: 'Bad sleep' });
 */
export const createEnergy = (
  date = '2024-01-15',
  level: DailyEnergyLevel = 'medium',
  overrides: Partial<DailyEnergy> = {}
): DailyEnergy => {
  const id = overrides.id ?? `energy-${++energyIdCounter}`;
  const now = new Date().toISOString();

  return {
    id,
    user_id: 'test-user-1',
    date,
    energy_level: level,
    notes: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// DayCapacity Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a DayCapacity object.
 *
 * @example
 * const capacity = createCapacity(480, 120); // 480 total, 120 scheduled
 */
export const createCapacity = (
  total = 480,
  scheduled = 0,
  overrides: Partial<DayCapacity> = {}
): DayCapacity => {
  const available = total - scheduled;
  const percentage = total > 0 ? Math.round((scheduled / total) * 100) : 0;

  return {
    total,
    scheduled,
    available,
    percentage,
    ...overrides,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// UserSettings Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates UserSettings with typical defaults.
 */
export const createSettings = (overrides: Partial<UserSettings> = {}): UserSettings => {
  return {
    work_start_time: '09:00',
    work_end_time: '17:00',
    daily_capacity_minutes: 480,
    timezone: 'America/New_York',
    availability_presets: {
      morning: { start: '09:00', end: '12:00' },
      afternoon: { start: '12:00', end: '17:00' },
      evening: { start: '17:00', end: '21:00' },
    },
    day_intention: 'balance',
    ...overrides,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SyncChange Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a SyncChange for testing calendar sync logic.
 */
export const createSyncChange = (
  type: 'new' | 'updated' | 'deleted',
  externalId: string,
  overrides: Partial<SyncChange> = {}
): SyncChange => {
  const base: SyncChange = {
    type,
    external_id: externalId,
  };

  if (type === 'new') {
    base.newEvent = {
      title: 'New Synced Event',
      start_time: '2024-01-15T10:00:00Z',
      end_time: '2024-01-15T11:00:00Z',
      is_external: true,
      external_id: externalId,
      calendar_source: 'google',
    };
  }

  return { ...base, ...overrides };
};

// ─────────────────────────────────────────────────────────────────────────────
// Batch Factories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates multiple tasks at once.
 *
 * @example
 * const tasks = createTasks(5); // 5 tasks with default settings
 * const highPriority = createTasks(3, { priority: 'high' });
 */
export const createTasks = (count: number, overrides: Partial<Task> = {}): Task[] => {
  return Array.from({ length: count }, () => createTask(overrides));
};

/**
 * Creates multiple events at once.
 */
export const createEvents = (count: number, overrides: Partial<CalendarEvent> = {}): CalendarEvent[] => {
  return Array.from({ length: count }, () => createEvent(overrides));
};

// ─────────────────────────────────────────────────────────────────────────────
// Test Scenario Builders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a typical day scenario for integration testing.
 * Returns tasks, events, and energy for a complete test day.
 */
export const createTestDay = (
  date = '2024-01-15',
  energyLevel: DailyEnergyLevel = 'medium',
  intention: DayIntention = 'balance'
) => {
  resetFactoryCounters();

  return {
    date,
    tasks: [
      createScheduledTask('09:00', date, { title: 'Morning standup', duration: 15 }),
      createScheduledTask('10:00', date, { title: 'Deep work', duration: 90, priority: 'high' }),
      createBacklogTask({ title: 'Review PRs', duration: 30 }),
      createBacklogTask({ title: 'Email catchup', duration: 20, priority: 'low' }),
    ],
    events: [
      createEventAt('12:00', '13:00', date, { title: 'Lunch', energy_level: 'restful' }),
      createEventAt('14:00', '15:00', date, { title: 'Team meeting', energy_level: 'medium' }),
    ],
    energy: createEnergy(date, energyLevel),
    settings: createSettings({ day_intention: intention }),
  };
};
