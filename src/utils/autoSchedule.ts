/**
 * Auto-Scheduling Algorithm
 * =========================
 *
 * This module implements energy-aware task scheduling using a greedy assignment
 * algorithm. Tasks are scored and assigned to time slots in priority order.
 *
 * ## Algorithm Overview
 *
 * 1. **Scoring Phase** (`scoreTasks`)
 *    - Each unscheduled task receives a priority score
 *    - Tasks are sorted by score (highest first)
 *
 * 2. **Slot Building Phase** (`buildTimeSlots`)
 *    - Day is divided into 15-minute slots
 *    - Slots blocked by events are marked unavailable
 *    - Past time slots (for today) are marked unavailable
 *
 * 3. **Assignment Phase** (`assignTasksToSlots`)
 *    - Greedy algorithm: highest-scored task gets first available slot
 *    - Respects task's availability windows (morning/afternoon/evening)
 *    - Marks slots as used after each assignment
 *
 * ## Scoring Formula
 *
 * ```
 * score = (priorityWeight × 10) + (motivationWeight × 2) + energyAlignmentBonus
 * ```
 *
 * ### Priority Weights (×10)
 * - high: 3 → 30 points
 * - medium: 2 → 20 points
 * - low: 1 → 10 points
 *
 * ### Motivation Weights (×2)
 * - love: 5 → 10 points
 * - like: 4 → 8 points
 * - neutral: 3 → 6 points
 * - dislike: 2 → 4 points
 * - hate: 1 → 2 points
 *
 * ### Energy Alignment Bonus (+2)
 * - High-energy task + high/energized daily energy → +2
 * - Low-energy task + low/exhausted daily energy → +2
 * - Medium-energy task (always comfortable) → +2
 * - Misaligned energy → 0
 *
 * ### Example Scores
 * - High priority, love it, energy aligned: 30 + 10 + 2 = 42
 * - Medium priority, neutral, misaligned: 20 + 6 + 0 = 26
 * - Low priority, hate it, misaligned: 10 + 2 + 0 = 12
 *
 * ## Design Rationale
 *
 * **Why 15-minute slots?**
 * - Balances granularity with simplicity
 * - Matches common calendar granularity
 * - Allows tasks as short as 15 minutes
 *
 * **Why greedy assignment?**
 * - Simple and predictable behavior
 * - Users can understand why tasks were placed
 * - O(n × m) complexity where n=tasks, m=slots
 * - Optimal algorithms (bin packing) are NP-hard and overkill
 *
 * **Why priority weighted 10× vs motivation 2×?**
 * - User-assigned priority reflects urgency/importance
 * - Motivation is secondary but breaks ties
 * - Prevents "fun but unimportant" tasks from dominating
 *
 * @module autoSchedule
 */

import type { AvailabilityWindows, CalendarEvent, DailyEnergyLevel, Task } from '@/types/task';
import { getTaskEnergyAlignmentBonus } from './energy';
import { getSettings } from './settings';
import { format, addDays } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A 15-minute time slot in the schedule.
 *
 * The day is divided into these slots, and tasks are assigned
 * to contiguous blocks of slots based on their duration.
 */
interface ScheduleSlot {
  /** Time in HH:MM format (e.g., "09:00", "09:15") */
  time: string;
  /** Whether this slot is available for scheduling */
  available: boolean;
  /** Duration of this slot in minutes (always 15) */
  duration: number;
}

/**
 * A task paired with its computed priority score.
 * Used for sorting tasks before assignment.
 */
type ScoredTask = {
  task: Task;
  /** Priority score (higher = scheduled first). See module docs for formula. */
  score: number;
};

/**
 * Check if a slot time is in the past for today (real-time check)
 */
const isSlotInPast = (slotTime: string, targetDate: string): boolean => {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (targetDate !== today) return false;
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [h, m] = slotTime.split(':').map(Number);
  const slotMinutes = h * 60 + m;
  
  return slotMinutes < currentMinutes;
};

/**
 * Filter out any tasks scheduled in the past (safety check)
 * Returns { valid, invalid } where invalid tasks should be treated as unscheduled
 */
const filterPastScheduledTasks = (
  scheduledTasks: Task[],
  targetDate: string
): { valid: Task[]; invalid: Task[] } => {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Only check for today's date
  if (targetDate !== today) {
    return { valid: scheduledTasks, invalid: [] };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const valid: Task[] = [];
  const invalid: Task[] = [];

  for (const task of scheduledTasks) {
    if (task.scheduled_time) {
      const [hours, minutes] = task.scheduled_time.split(':').map(Number);
      const taskMinutes = hours * 60 + minutes;
      
      if (taskMinutes < currentMinutes) {
        // Task is in the past, mark as invalid
        invalid.push({ ...task, scheduled_time: undefined, scheduled_date: undefined });
      } else {
        valid.push(task);
      }
    } else {
      valid.push(task);
    }
  }

  return { valid, invalid };
};

/**
 * Main entry point for auto-scheduling tasks.
 *
 * Orchestrates the three-phase scheduling algorithm:
 * 1. Score tasks by priority, motivation, and energy alignment
 * 2. Build available time slots (excluding events and past time)
 * 3. Assign highest-scored tasks to first available slots
 *
 * @param tasks - All tasks (will filter to unscheduled, incomplete)
 * @param events - Calendar events that block time slots
 * @param workStart - Work day start time in HH:MM format
 * @param workEnd - Work day end time in HH:MM format
 * @param dailyEnergy - User's energy level for energy alignment scoring
 * @param targetDate - Date to schedule for in YYYY-MM-DD format
 * @returns Array of tasks with scheduled_time and scheduled_date set
 *
 * @example
 * const scheduled = autoScheduleTasks(
 *   tasks,
 *   events,
 *   '09:00',
 *   '17:00',
 *   'high',
 *   '2024-01-15'
 * );
 */
export const autoScheduleTasks = (
  tasks: Task[],
  events: CalendarEvent[],
  workStart: string,
  workEnd: string,
  dailyEnergy: DailyEnergyLevel,
  targetDate: string
): Task[] => {
  const scoredTasks = scoreTasks(tasks, dailyEnergy);
  const slots = buildTimeSlots(workStart, workEnd, events, targetDate);
  return assignTasksToSlots(scoredTasks, slots, targetDate);
};

/**
 * Phase 1: Score and sort tasks for scheduling.
 *
 * Filters to only unscheduled, incomplete tasks, then scores each one
 * and sorts by score (highest first). The highest-scored task will be
 * assigned to the first available slot.
 *
 * @param tasks - All tasks to consider
 * @param dailyEnergy - User's energy level for alignment bonus
 * @returns Scored tasks sorted by score descending
 *
 * @see calculateTaskScore for the scoring formula
 */
export const scoreTasks = (tasks: Task[], dailyEnergy: DailyEnergyLevel): ScoredTask[] => {
  return tasks
    .filter(task => !task.scheduled_time && !task.completed)
    .map(task => ({
      task,
      score: calculateTaskScore(task, dailyEnergy),
    }))
    .sort((a, b) => b.score - a.score);
};

/**
 * Phase 2: Build the time slot grid for a day.
 *
 * Creates 15-minute slots from workStart to workEnd, then marks slots
 * as unavailable if they:
 * - Are in the past (for today only)
 * - Overlap with calendar events
 *
 * ## Slot Structure Example (09:00-12:00)
 * ```
 * 09:00 ✓ available
 * 09:15 ✓ available
 * 09:30 ✗ blocked by event
 * 09:45 ✗ blocked by event
 * 10:00 ✓ available
 * ...
 * ```
 *
 * @param workStart - Work day start time (e.g., "09:00")
 * @param workEnd - Work day end time (e.g., "17:00")
 * @param events - Calendar events that block slots
 * @param targetDate - Date in YYYY-MM-DD format
 * @returns Array of 15-minute slots with availability status
 */
export const buildTimeSlots = (
  workStart: string,
  workEnd: string,
  events: CalendarEvent[],
  targetDate: string
): ScheduleSlot[] => {
  const slots: ScheduleSlot[] = [];
  const [startHour] = workStart.split(':').map(Number);
  const [endHour] = workEnd.split(':').map(Number);

  // Check if we're scheduling for today
  const today = format(new Date(), 'yyyy-MM-dd');
  const isToday = targetDate === today;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Generate 15-minute slots for each hour
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const slotMinutes = h * 60 + m;
      // Mark past slots as unavailable when scheduling for today
      const isPast = isToday && slotMinutes < currentMinutes;
      slots.push({ time, available: !isPast, duration: 15 });
    }
  }

  // Block slots that overlap with events
  events.forEach(event => {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);

    // Use LOCAL time from event dates to match how slots are defined and displayed
    // This ensures consistency regardless of how the event was stored (UTC vs local)
    const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
    const eventEndMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();

    slots.forEach(slot => {
      const [h, m] = slot.time.split(':').map(Number);
      const slotMinutes = h * 60 + m;

      // Slot is blocked if it falls within event's time range
      if (slotMinutes >= eventStartMinutes && slotMinutes < eventEndMinutes) {
        slot.available = false;
      }
    });
  });

  return slots;
};

/**
 * Phase 3: Assign scored tasks to available time slots.
 *
 * Uses a greedy algorithm: processes tasks in score order and assigns each
 * to the first available slot that fits. Once a task is assigned, those slots
 * are marked unavailable for subsequent tasks.
 *
 * ## Algorithm
 * ```
 * for each task (highest score first):
 *   slot = findBestSlot(task)
 *   if slot exists:
 *     assign task to slot
 *     mark slots as used
 * ```
 *
 * @param scoredTasks - Tasks sorted by score (highest first)
 * @param slots - Available time slots
 * @param targetDate - Date being scheduled
 * @returns Tasks with scheduled_time and scheduled_date populated
 */
export const assignTasksToSlots = (
  scoredTasks: ScoredTask[],
  slots: ScheduleSlot[],
  targetDate: string
): Task[] => {
  const scheduled: Task[] = [];

  for (const { task } of scoredTasks) {
    const slot = findBestSlot(task, slots, targetDate);
    if (!slot) continue;

    scheduled.push({
      ...task,
      scheduled_time: slot.time,
      scheduled_date: targetDate,
    });
    markSlotsUsed(slots, slot.time, task.duration);
  }

  // Safety check: filter out any tasks that ended up in the past
  const { valid } = filterPastScheduledTasks(scheduled, targetDate);
  return valid;
};

/**
 * Calculate a task's priority score for scheduling order.
 *
 * ## Formula
 * ```
 * score = (priorityWeight × 10) + (motivationWeight × 2) + energyBonus
 * ```
 *
 * ## Weight Rationale
 *
 * **Priority (×10)**: Dominates the score because user-assigned priority
 * reflects urgency and importance. A high-priority task should almost always
 * be scheduled before a low-priority one.
 *
 * **Motivation (×2)**: Secondary factor that breaks ties between same-priority
 * tasks. Enjoyable tasks scheduled earlier can improve momentum.
 *
 * **Energy Alignment (+2)**: Small bonus for matching task energy requirements
 * to current energy level. Helps optimize cognitive load distribution.
 *
 * ## Score Ranges
 * - Maximum: 42 (high + love + aligned)
 * - Typical: 20-30
 * - Minimum: 12 (low + hate + misaligned)
 *
 * @param task - The task to score
 * @param dailyEnergy - User's current energy level
 * @returns Priority score (higher = scheduled first)
 */
const calculateTaskScore = (task: Task, dailyEnergy: DailyEnergyLevel): number => {
  // Priority: high=30, medium=20, low=10
  const priorityWeight = { high: 3, medium: 2, low: 1 }[task.priority];

  // Motivation: love=10, like=8, neutral=6, dislike=4, hate=2
  const motivationWeight = { love: 5, like: 4, neutral: 3, dislike: 2, hate: 1 }[
    task.motivation_level
  ];

  // Energy alignment: +2 if task energy matches daily energy level
  const energyBonus = getTaskEnergyAlignmentBonus(task, dailyEnergy);

  return priorityWeight * 10 + motivationWeight * 2 + energyBonus;
};

/**
 * Find the best available slot for a task.
 *
 * "Best" = first available contiguous block that:
 * 1. Has enough slots for the task duration
 * 2. Falls within the task's availability windows
 * 3. Is not in the past (real-time check)
 *
 * ## Availability Windows
 *
 * Tasks can specify preferred time windows:
 * - `[]` (empty) = any time is fine
 * - `['morning']` = only schedule during morning preset hours
 * - `['morning', 'evening']` = morning OR evening
 *
 * Presets are defined in user settings with start/end times.
 *
 * ## Slot Matching
 *
 * For a 45-minute task, we need 3 contiguous 15-minute slots:
 * ```
 * 09:00 ✓ available + in window
 * 09:15 ✓ available + in window
 * 09:30 ✓ available + in window
 * → Returns slot at 09:00
 * ```
 *
 * @param task - Task to find slot for
 * @param slots - Available time slots
 * @param targetDate - Date being scheduled (for past-time checks)
 * @returns First suitable slot, or null if none available
 */
const findBestSlot = (task: Task, slots: ScheduleSlot[], targetDate: string): ScheduleSlot | null => {
  const requiredSlots = Math.ceil(task.duration / 15);
  const settings = getSettings();
  const windows = task.availability_windows || [];

  // Build list of allowed time ranges
  // Empty array means "any time"
  const timeRanges: Array<{ start: string; end: string }> = [];
  if (windows.length === 0) {
    timeRanges.push({ start: '00:00', end: '23:59' });
  } else {
    for (const window of windows) {
      const config = settings.availability_presets[window];
      timeRanges.push({ start: config.start, end: config.end });
    }
  }

  const isSlotInWindow = (slotTime: string): boolean => {
    return timeRanges.some(range => slotTime >= range.start && slotTime < range.end);
  };

  // Scan for first contiguous block of available slots in allowed windows
  for (let i = 0; i <= slots.length - requiredSlots; i++) {
    // Real-time check: skip if this slot is now in the past
    if (isSlotInPast(slots[i].time, targetDate)) continue;

    const block = slots.slice(i, i + requiredSlots);
    // Check all slots in block are available AND within any of the task's allowed windows
    if (block.every(slot => slot.available && isSlotInWindow(slot.time))) {
      return slots[i];
    }
  }

  return null;
};

const markSlotsUsed = (slots: ScheduleSlot[], startTime: string, duration: number): void => {
  const requiredSlots = Math.ceil(duration / 15);
  const startIndex = slots.findIndex(slot => slot.time === startTime);

  for (let i = startIndex; i < startIndex + requiredSlots && i < slots.length; i++) {
    slots[i].available = false;
  }
};

/**
 * Check if a given time is in the past for today
 */
export const isTimeInPast = (time: string, date: string): boolean => {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (date !== today) return false;

  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const slotMinutes = hours * 60 + minutes;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return slotMinutes < currentMinutes;
};

/**
 * Find the next available time slot for a task on a given date
 * Returns null if no slot is available
 */
export const findNextAvailableSlot = (
  targetDate: string,
  duration: number,
  windows: AvailabilityWindows,
  events: CalendarEvent[],
  tasks: Task[]
): string | null => {
  const settings = getSettings();
  const slots = buildTimeSlots(settings.work_start_time, settings.work_end_time, events, targetDate);

  // Mark slots used by already-scheduled tasks
  for (const task of tasks) {
    if (task.scheduled_date === targetDate && task.scheduled_time && !task.completed) {
      markSlotsUsed(slots, task.scheduled_time, task.duration);
    }
  }

  const requiredSlots = Math.ceil(duration / 15);

  // Build list of allowed time ranges (empty array = any time)
  const timeRanges: Array<{ start: string; end: string }> = [];
  if (windows.length === 0) {
    timeRanges.push({ start: '00:00', end: '23:59' });
  } else {
    for (const window of windows) {
      const config = settings.availability_presets[window];
      timeRanges.push({ start: config.start, end: config.end });
    }
  }

  const isSlotInWindow = (slotTime: string): boolean => {
    return timeRanges.some(range => slotTime >= range.start && slotTime < range.end);
  };

  // Find first contiguous block of available slots
  for (let i = 0; i <= slots.length - requiredSlots; i++) {
    const block = slots.slice(i, i + requiredSlots);
    if (block.every(slot => slot.available && isSlotInWindow(slot.time))) {
      return slots[i].time;
    }
  }

  return null;
};

/**
 * Find the next available day that has a slot for the task
 * Searches up to maxDays ahead (default 7)
 * Returns { date, time } or null if no slot found
 */
export const findNextAvailableDay = (
  startDate: string,
  duration: number,
  windows: AvailabilityWindows,
  events: CalendarEvent[],
  tasks: Task[],
  maxDays = 7
): { date: string; time: string } | null => {
  let currentDate = new Date(startDate);

  for (let i = 0; i < maxDays; i++) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const time = findNextAvailableSlot(dateStr, duration, windows, events, tasks);
    
    if (time) {
      return { date: dateStr, time };
    }

    currentDate = addDays(currentDate, 1);
  }

  return null;
};

/**
 * Auto-schedule selected tasks only (for "Optimize Selected" feature)
 * Skips locked tasks and tasks not in the provided IDs list
 */
export const autoScheduleSelectedTasks = (
  allTasks: Task[],
  selectedIds: string[],
  events: CalendarEvent[],
  workStart: string,
  workEnd: string,
  dailyEnergy: DailyEnergyLevel,
  targetDate: string
): Task[] => {
  // Filter to only selected, unscheduled, unlocked, incomplete tasks for today or with no date
  const tasksToSchedule = allTasks.filter(
    task =>
      selectedIds.includes(task.id) &&
      !task.scheduled_time &&
      !task.completed &&
      !task.is_locked &&
      (!task.scheduled_date || task.scheduled_date === targetDate)
  );

  if (tasksToSchedule.length === 0) return [];

  const scoredTasks = scoreTasks(tasksToSchedule, dailyEnergy);
  
  // Build slots but mark existing scheduled tasks as occupied
  const slots = buildTimeSlots(workStart, workEnd, events, targetDate);
  
  // Mark slots used by already-scheduled tasks (whether locked or not)
  for (const task of allTasks) {
    if (task.scheduled_date === targetDate && task.scheduled_time && !task.completed) {
      markSlotsUsed(slots, task.scheduled_time, task.duration);
    }
  }

  return assignTasksToSlots(scoredTasks, slots, targetDate);
};

/**
 * Auto-schedule all unlocked tasks on today's timeline (for header "Reschedule" button)
 * Only reschedules tasks already on the timeline - does not pull from backlog
 * Locked tasks keep their time slots, unlocked tasks get rescheduled to optimal slots
 */
export const autoScheduleAllUnlocked = (
  allTasks: Task[],
  events: CalendarEvent[],
  workStart: string,
  workEnd: string,
  dailyEnergy: DailyEnergyLevel,
  targetDate: string
): Task[] => {
  // Only reschedule unlocked tasks already on today's timeline
  // Must have both scheduled_date === today AND scheduled_time set
  const tasksToSchedule = allTasks.filter(task =>
    !task.is_locked &&
    !task.completed &&
    task.scheduled_date === targetDate &&
    task.scheduled_time  // Must be on timeline (has a time)
  );

  if (tasksToSchedule.length === 0) return [];

  // Score all tasks for optimal ordering
  const scoredTasks = scoreTasksForReschedule(tasksToSchedule, dailyEnergy);
  
  // Build slots - only mark LOCKED tasks as blocking (since unlocked will be rescheduled)
  const slots = buildTimeSlots(workStart, workEnd, events, targetDate);
  
  // Mark slots used by locked tasks only
  for (const task of allTasks) {
    if (task.is_locked && task.scheduled_date === targetDate && task.scheduled_time && !task.completed) {
      markSlotsUsed(slots, task.scheduled_time, task.duration);
    }
  }

  return assignTasksToSlots(scoredTasks, slots, targetDate);
};

/**
 * Score tasks for rescheduling (includes tasks that already have scheduled_time)
 */
const scoreTasksForReschedule = (tasks: Task[], dailyEnergy: DailyEnergyLevel): ScoredTask[] => {
  return tasks
    .filter(task => !task.completed)
    .map(task => ({
      task,
      score: calculateTaskScore(task, dailyEnergy),
    }))
    .sort((a, b) => b.score - a.score);
};

/**
 * Auto-schedule all backlog tasks (for "Optimize All" feature in backlog)
 * Only schedules tasks without scheduled_time, skips locked tasks
 */
export const autoScheduleBacklogTasks = (
  allTasks: Task[],
  events: CalendarEvent[],
  workStart: string,
  workEnd: string,
  dailyEnergy: DailyEnergyLevel,
  targetDate: string
): Task[] => {
  // Filter to only unscheduled, unlocked, incomplete tasks for today or with no date
  const tasksToSchedule = allTasks.filter(
    task => !task.scheduled_time &&
            !task.completed &&
            !task.is_locked &&
            (!task.scheduled_date || task.scheduled_date === targetDate)
  );

  if (tasksToSchedule.length === 0) return [];

  const scoredTasks = scoreTasks(tasksToSchedule, dailyEnergy);
  
  // Build slots but mark existing scheduled tasks as occupied
  const slots = buildTimeSlots(workStart, workEnd, events, targetDate);
  
  // Mark slots used by already-scheduled tasks (preserving timeline)
  for (const task of allTasks) {
    if (task.scheduled_date === targetDate && task.scheduled_time && !task.completed) {
      markSlotsUsed(slots, task.scheduled_time, task.duration);
    }
  }

  return assignTasksToSlots(scoredTasks, slots, targetDate);
};

/**
 * Find next available slot ignoring the task's availability preset
 * but still respecting work hours
 */
export const findNextAvailableSlotIgnoringPreset = (
  targetDate: string,
  duration: number,
  events: CalendarEvent[],
  tasks: Task[]
): string | null => {
  const settings = getSettings();
  const slots = buildTimeSlots(settings.work_start_time, settings.work_end_time, events, targetDate);

  // Mark slots used by already-scheduled tasks
  for (const task of tasks) {
    if (task.scheduled_date === targetDate && task.scheduled_time && !task.completed) {
      markSlotsUsed(slots, task.scheduled_time, task.duration);
    }
  }

  const requiredSlots = Math.ceil(duration / 15);

  // Find first contiguous block of available slots (no preset filtering)
  for (let i = 0; i <= slots.length - requiredSlots; i++) {
    const block = slots.slice(i, i + requiredSlots);
    if (block.every(slot => slot.available)) {
      return slots[i].time;
    }
  }

  return null;
};

/**
 * Find next available slot ignoring both preset and work hours
 * Searches the full day (6:00 - 23:00)
 */
export const findNextAvailableSlotIgnoringAll = (
  targetDate: string,
  duration: number,
  events: CalendarEvent[],
  tasks: Task[]
): string | null => {
  // Use extended hours for full day scheduling
  const slots = buildTimeSlots('06:00', '23:00', events, targetDate);

  // Mark slots used by already-scheduled tasks
  for (const task of tasks) {
    if (task.scheduled_date === targetDate && task.scheduled_time && !task.completed) {
      markSlotsUsed(slots, task.scheduled_time, task.duration);
    }
  }

  const requiredSlots = Math.ceil(duration / 15);

  // Find first contiguous block of available slots
  for (let i = 0; i <= slots.length - requiredSlots; i++) {
    const block = slots.slice(i, i + requiredSlots);
    if (block.every(slot => slot.available)) {
      return slots[i].time;
    }
  }

  return null;
};

/**
 * Schedule tasks for next day only, respecting constraints
 * Returns { scheduled, unscheduled } arrays
 */
export const scheduleTasksForNextDay = (
  tasksToSchedule: Task[],
  allTasks: Task[],
  events: CalendarEvent[],
  workStart: string,
  workEnd: string,
  dailyEnergy: DailyEnergyLevel,
  todayDate: string
): { scheduled: Task[]; unscheduled: Task[] } => {
  const nextDayDate = format(addDays(new Date(todayDate), 1), 'yyyy-MM-dd');
  
  const scoredTasks = scoreTasks(tasksToSchedule, dailyEnergy);
  const slots = buildTimeSlots(workStart, workEnd, events, nextDayDate);

  // Mark slots used by already-scheduled tasks on next day
  for (const task of allTasks) {
    if (task.scheduled_date === nextDayDate && task.scheduled_time && !task.completed) {
      markSlotsUsed(slots, task.scheduled_time, task.duration);
    }
  }

  const scheduled: Task[] = [];
  const unscheduled: Task[] = [];

  for (const { task } of scoredTasks) {
    const slot = findBestSlotForTask(task, slots, nextDayDate);
    if (slot) {
      scheduled.push({
        ...task,
        scheduled_time: slot.time,
        scheduled_date: nextDayDate,
      });
      markSlotsUsed(slots, slot.time, task.duration);
    } else {
      unscheduled.push(task);
    }
  }

  return { scheduled, unscheduled };
};

/**
 * Schedule tasks ignoring preset constraints (but respecting work hours)
 * Returns { scheduled, unscheduled } arrays
 */
export const scheduleTasksIgnoringPreset = (
  tasksToSchedule: Task[],
  allTasks: Task[],
  events: CalendarEvent[],
  workStart: string,
  workEnd: string,
  dailyEnergy: DailyEnergyLevel,
  targetDate: string
): { scheduled: Task[]; unscheduled: Task[] } => {
  const scoredTasks = scoreTasks(tasksToSchedule, dailyEnergy);
  const slots = buildTimeSlots(workStart, workEnd, events, targetDate);

  // Mark slots used by already-scheduled tasks
  for (const task of allTasks) {
    if (task.scheduled_date === targetDate && task.scheduled_time && !task.completed) {
      markSlotsUsed(slots, task.scheduled_time, task.duration);
    }
  }

  const scheduled: Task[] = [];
  const unscheduled: Task[] = [];

  for (const { task } of scoredTasks) {
    // Find slot without preset filtering
    const slot = findSlotWithoutPreset(task, slots, targetDate);
    if (slot) {
      scheduled.push({
        ...task,
        scheduled_time: slot.time,
        scheduled_date: targetDate,
      });
      markSlotsUsed(slots, slot.time, task.duration);
    } else {
      unscheduled.push(task);
    }
  }

  // Safety check: filter out any tasks that ended up in the past
  const { valid, invalid } = filterPastScheduledTasks(scheduled, targetDate);
  return { scheduled: valid, unscheduled: [...unscheduled, ...invalid] };
};

/**
 * Schedule tasks ignoring all constraints (preset + work hours)
 * Returns { scheduled, unscheduled } arrays
 */
export const scheduleTasksIgnoringAll = (
  tasksToSchedule: Task[],
  allTasks: Task[],
  events: CalendarEvent[],
  dailyEnergy: DailyEnergyLevel,
  targetDate: string
): { scheduled: Task[]; unscheduled: Task[] } => {
  const scoredTasks = scoreTasks(tasksToSchedule, dailyEnergy);
  // Use extended hours
  const slots = buildTimeSlots('06:00', '23:00', events, targetDate);

  // Mark slots used by already-scheduled tasks
  for (const task of allTasks) {
    if (task.scheduled_date === targetDate && task.scheduled_time && !task.completed) {
      markSlotsUsed(slots, task.scheduled_time, task.duration);
    }
  }

  const scheduled: Task[] = [];
  const unscheduled: Task[] = [];

  for (const { task } of scoredTasks) {
    // Find slot without any filtering
    const slot = findSlotWithoutPreset(task, slots, targetDate);
    if (slot) {
      scheduled.push({
        ...task,
        scheduled_time: slot.time,
        scheduled_date: targetDate,
      });
      markSlotsUsed(slots, slot.time, task.duration);
    } else {
      unscheduled.push(task);
    }
  }

  // Safety check: filter out any tasks that ended up in the past
  const { valid, invalid } = filterPastScheduledTasks(scheduled, targetDate);
  return { scheduled: valid, unscheduled: [...unscheduled, ...invalid] };
};

/**
 * Find best slot for a task respecting its availability windows
 * Includes real-time past check to ensure we never schedule in the past
 */
const findBestSlotForTask = (task: Task, slots: ScheduleSlot[], targetDate: string): ScheduleSlot | null => {
  const requiredSlots = Math.ceil(task.duration / 15);
  const settings = getSettings();
  const windows = task.availability_windows || [];

  // Build list of allowed time ranges (empty array = any time)
  const timeRanges: Array<{ start: string; end: string }> = [];
  if (windows.length === 0) {
    timeRanges.push({ start: '00:00', end: '23:59' });
  } else {
    for (const window of windows) {
      const config = settings.availability_presets[window];
      timeRanges.push({ start: config.start, end: config.end });
    }
  }

  const isSlotInWindow = (slotTime: string): boolean => {
    return timeRanges.some(range => slotTime >= range.start && slotTime < range.end);
  };

  for (let i = 0; i <= slots.length - requiredSlots; i++) {
    // Real-time check: skip if this slot is now in the past
    if (isSlotInPast(slots[i].time, targetDate)) continue;

    const block = slots.slice(i, i + requiredSlots);
    if (block.every(slot => slot.available && isSlotInWindow(slot.time))) {
      return slots[i];
    }
  }

  return null;
};

/**
 * Find slot without preset filtering (just check availability)
 * Includes real-time past check to ensure we never schedule in the past
 */
const findSlotWithoutPreset = (task: Task, slots: ScheduleSlot[], targetDate: string): ScheduleSlot | null => {
  const requiredSlots = Math.ceil(task.duration / 15);

  for (let i = 0; i <= slots.length - requiredSlots; i++) {
    // Real-time check: skip if this slot is now in the past
    if (isSlotInPast(slots[i].time, targetDate)) continue;
    
    const block = slots.slice(i, i + requiredSlots);
    if (block.every(slot => slot.available)) {
      return slots[i];
    }
  }

  return null;
};
