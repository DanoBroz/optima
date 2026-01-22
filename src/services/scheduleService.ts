import type { AvailabilityWindows, CalendarEvent, DailyEnergyLevel, Task } from '@/types/task';
import {
  autoScheduleTasks,
  autoScheduleSelectedTasks,
  autoScheduleBacklogTasks,
  autoScheduleAllUnlocked,
  findNextAvailableSlot,
  findNextAvailableDay,
  isTimeInPast,
  scheduleTasksForNextDay,
  scheduleTasksIgnoringPreset,
  scheduleTasksIgnoringAll,
} from '@/utils/autoSchedule';
import { getSettings } from '@/utils/settings';

export const scheduleService = {
  autoSchedule(
    tasks: Task[],
    events: CalendarEvent[],
    dailyEnergy: DailyEnergyLevel,
    targetDate: string
  ): Task[] {
    const settings = getSettings();
    return autoScheduleTasks(
      tasks,
      events,
      settings.work_start_time,
      settings.work_end_time,
      dailyEnergy,
      targetDate
    );
  },

  /**
   * Schedule all unlocked tasks (re-optimize timeline + schedule backlog)
   * Locked tasks keep their slots, everything else is rescheduled
   */
  autoScheduleAllUnlocked(
    tasks: Task[],
    events: CalendarEvent[],
    dailyEnergy: DailyEnergyLevel,
    targetDate: string
  ): Task[] {
    const settings = getSettings();
    return autoScheduleAllUnlocked(
      tasks,
      events,
      settings.work_start_time,
      settings.work_end_time,
      dailyEnergy,
      targetDate
    );
  },

  /**
   * Schedule only the selected task IDs
   */
  autoScheduleSelected(
    tasks: Task[],
    selectedIds: string[],
    events: CalendarEvent[],
    dailyEnergy: DailyEnergyLevel,
    targetDate: string
  ): Task[] {
    const settings = getSettings();
    return autoScheduleSelectedTasks(
      tasks,
      selectedIds,
      events,
      settings.work_start_time,
      settings.work_end_time,
      dailyEnergy,
      targetDate
    );
  },

  /**
   * Schedule all backlog tasks, preserving timeline
   */
  autoScheduleBacklog(
    tasks: Task[],
    events: CalendarEvent[],
    dailyEnergy: DailyEnergyLevel,
    targetDate: string
  ): Task[] {
    const settings = getSettings();
    return autoScheduleBacklogTasks(
      tasks,
      events,
      settings.work_start_time,
      settings.work_end_time,
      dailyEnergy,
      targetDate
    );
  },

  /**
   * Find next available slot on a specific date
   */
  findNextSlot(
    targetDate: string,
    duration: number,
    windows: AvailabilityWindows,
    events: CalendarEvent[],
    tasks: Task[]
  ): string | null {
    return findNextAvailableSlot(targetDate, duration, windows, events, tasks);
  },

  /**
   * Find next available day with a slot
   */
  findNextDay(
    startDate: string,
    duration: number,
    windows: AvailabilityWindows,
    events: CalendarEvent[],
    tasks: Task[],
    maxDays = 7
  ): { date: string; time: string } | null {
    return findNextAvailableDay(startDate, duration, windows, events, tasks, maxDays);
  },

  /**
   * Check if a time is in the past for a given date
   */
  isTimeInPast(time: string, date: string): boolean {
    return isTimeInPast(time, date);
  },

  /**
   * Schedule tasks for next day only, respecting constraints
   */
  scheduleForNextDay(
    tasksToSchedule: Task[],
    allTasks: Task[],
    events: CalendarEvent[],
    dailyEnergy: DailyEnergyLevel,
    todayDate: string
  ): { scheduled: Task[]; unscheduled: Task[] } {
    const settings = getSettings();
    return scheduleTasksForNextDay(
      tasksToSchedule,
      allTasks,
      events,
      settings.work_start_time,
      settings.work_end_time,
      dailyEnergy,
      todayDate
    );
  },

  /**
   * Schedule tasks ignoring preset constraints (but respecting work hours)
   */
  scheduleIgnoringPreset(
    tasksToSchedule: Task[],
    allTasks: Task[],
    events: CalendarEvent[],
    dailyEnergy: DailyEnergyLevel,
    targetDate: string
  ): { scheduled: Task[]; unscheduled: Task[] } {
    const settings = getSettings();
    return scheduleTasksIgnoringPreset(
      tasksToSchedule,
      allTasks,
      events,
      settings.work_start_time,
      settings.work_end_time,
      dailyEnergy,
      targetDate
    );
  },

  /**
   * Schedule tasks ignoring all constraints (preset + work hours)
   */
  scheduleIgnoringAll(
    tasksToSchedule: Task[],
    allTasks: Task[],
    events: CalendarEvent[],
    dailyEnergy: DailyEnergyLevel,
    targetDate: string
  ): { scheduled: Task[]; unscheduled: Task[] } {
    return scheduleTasksIgnoringAll(
      tasksToSchedule,
      allTasks,
      events,
      dailyEnergy,
      targetDate
    );
  },
};
