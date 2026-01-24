/**
 * Auto-scheduling operations hook.
 * Handles autoSchedule, autoScheduleSelected, autoScheduleBacklog,
 * scheduleForNextDay, scheduleIgnoringPreset, scheduleIgnoringAll,
 * findNextSlotToday, findNextSlotTomorrow, isTimeInPast.
 */
import { useCallback, useState } from 'react';
import type { Task, CalendarEvent, DailyEnergyLevel, AvailabilityWindows } from '@/types/task';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { taskRepository } from '@/data/taskRepository';
import { scheduleService } from '@/services/scheduleService';
import type { User } from '@supabase/supabase-js';

const DEFAULT_DAILY_ENERGY: DailyEnergyLevel = 'medium';

interface UseSchedulingParams {
  user: User | null;
  dateStr: string;
  selectedDate: Date;
  tasks: Task[];
  events: CalendarEvent[];
  dailyEnergyLevel: DailyEnergyLevel | undefined;
  fetchTasks: () => Promise<void>;
}

interface ScheduleResult {
  scheduled: Task[];
  unscheduled: Task[];
}

export function useScheduling({
  user,
  dateStr,
  selectedDate,
  tasks,
  events,
  dailyEnergyLevel,
  fetchTasks,
}: UseSchedulingParams) {
  const [isScheduling, setIsScheduling] = useState(false);

  const energyLevel = dailyEnergyLevel || DEFAULT_DAILY_ENERGY;

  const autoSchedule = useCallback(async (): Promise<ScheduleResult> => {
    if (!user) {
      toast.error('Please sign in to schedule tasks');
      return { scheduled: [], unscheduled: [] };
    }

    // Get all unlocked, incomplete tasks that could be (re)scheduled
    const tasksToOptimize = tasks.filter(task =>
      !task.is_locked &&
      !task.completed &&
      (task.scheduled_date === dateStr || (!task.scheduled_time && !task.scheduled_date))
    );

    if (tasksToOptimize.length === 0) {
      toast.info('No tasks to optimize');
      return { scheduled: [], unscheduled: [] };
    }

    setIsScheduling(true);
    try {
      const scheduledTasks = scheduleService.autoScheduleAllUnlocked(
        tasks,
        events,
        energyLevel,
        dateStr
      );

      const scheduledIds = new Set(scheduledTasks.map(t => t.id));
      const unscheduledTasks = tasksToOptimize.filter(t => !scheduledIds.has(t.id));

      if (scheduledTasks.length > 0) {
        await taskRepository.bulkUpdate(scheduledTasks);
        await fetchTasks();
      }

      if (scheduledTasks.length > 0 && unscheduledTasks.length === 0) {
        toast.success(`Optimized ${scheduledTasks.length} tasks`);
      } else if (scheduledTasks.length > 0 && unscheduledTasks.length > 0) {
        toast.success(`Scheduled ${scheduledTasks.length} tasks`);
      }

      return { scheduled: scheduledTasks, unscheduled: unscheduledTasks };
    } catch (error) {
      console.error('Auto-schedule error:', error);
      return { scheduled: [], unscheduled: tasksToOptimize };
    } finally {
      setIsScheduling(false);
    }
  }, [user, tasks, events, energyLevel, dateStr, fetchTasks]);

  const autoScheduleSelected = useCallback(async (selectedIds: string[]): Promise<ScheduleResult> => {
    if (!user) {
      toast.error('Please sign in to schedule tasks');
      return { scheduled: [], unscheduled: [] };
    }

    if (selectedIds.length === 0) {
      toast.info('No tasks selected');
      return { scheduled: [], unscheduled: [] };
    }

    const selectedTasks = tasks.filter(
      t => selectedIds.includes(t.id) && !t.completed && !t.is_locked && !t.scheduled_time
    );

    setIsScheduling(true);
    try {
      const scheduledTasks = scheduleService.autoScheduleSelected(
        tasks,
        selectedIds,
        events,
        energyLevel,
        dateStr
      );

      const scheduledIdsSet = new Set(scheduledTasks.map(t => t.id));
      const unscheduledTasks = selectedTasks.filter(t => !scheduledIdsSet.has(t.id));

      if (scheduledTasks.length > 0) {
        await taskRepository.bulkUpdate(scheduledTasks);
        await fetchTasks();
      }

      if (scheduledTasks.length > 0 && unscheduledTasks.length === 0) {
        toast.success(`Scheduled ${scheduledTasks.length} of ${selectedIds.length} selected tasks`);
      } else if (scheduledTasks.length > 0 && unscheduledTasks.length > 0) {
        toast.success(`Scheduled ${scheduledTasks.length} tasks`);
      }

      return { scheduled: scheduledTasks, unscheduled: unscheduledTasks };
    } catch (error) {
      console.error('Auto-schedule selected error:', error);
      return { scheduled: [], unscheduled: selectedTasks };
    } finally {
      setIsScheduling(false);
    }
  }, [user, tasks, events, energyLevel, dateStr, fetchTasks]);

  const autoScheduleBacklog = useCallback(async (): Promise<ScheduleResult> => {
    if (!user) {
      toast.error('Please sign in to schedule tasks');
      return { scheduled: [], unscheduled: [] };
    }

    const backlogTasks = tasks.filter(
      task => !task.scheduled_time &&
              !task.completed &&
              !task.is_locked &&
              (!task.scheduled_date || task.scheduled_date === dateStr)
    );

    if (backlogTasks.length === 0) {
      toast.info('No backlog tasks to schedule');
      return { scheduled: [], unscheduled: [] };
    }

    setIsScheduling(true);
    try {
      const scheduledTasks = scheduleService.autoScheduleBacklog(
        tasks,
        events,
        energyLevel,
        dateStr
      );

      const scheduledIds = new Set(scheduledTasks.map(t => t.id));
      const unscheduledTasks = backlogTasks.filter(t => !scheduledIds.has(t.id));

      if (scheduledTasks.length > 0) {
        await taskRepository.bulkUpdate(scheduledTasks);
        await fetchTasks();
      }

      if (scheduledTasks.length > 0 && unscheduledTasks.length === 0) {
        toast.success(`Scheduled ${scheduledTasks.length} backlog tasks`);
      } else if (scheduledTasks.length > 0 && unscheduledTasks.length > 0) {
        toast.success(`Scheduled ${scheduledTasks.length} tasks`);
      }

      return { scheduled: scheduledTasks, unscheduled: unscheduledTasks };
    } catch (error) {
      console.error('Auto-schedule backlog error:', error);
      return { scheduled: [], unscheduled: backlogTasks };
    } finally {
      setIsScheduling(false);
    }
  }, [user, tasks, events, energyLevel, dateStr, fetchTasks]);

  const scheduleForNextDay = useCallback(async (tasksToSchedule: Task[]): Promise<Task[]> => {
    if (!user || tasksToSchedule.length === 0) return tasksToSchedule;

    setIsScheduling(true);
    try {
      const { scheduled, unscheduled } = scheduleService.scheduleForNextDay(
        tasksToSchedule,
        tasks,
        events,
        energyLevel,
        dateStr
      );

      if (scheduled.length > 0) {
        await taskRepository.bulkUpdate(scheduled);
        await fetchTasks();
        toast.success(`Scheduled ${scheduled.length} tasks for tomorrow`);
      }

      if (unscheduled.length > 0) {
        toast.info(`${unscheduled.length} tasks couldn't fit tomorrow, kept in backlog`);
      }

      return unscheduled;
    } catch (error) {
      console.error('Schedule for next day error:', error);
      toast.error('Failed to schedule tasks');
      return tasksToSchedule;
    } finally {
      setIsScheduling(false);
    }
  }, [user, tasks, events, energyLevel, dateStr, fetchTasks]);

  const scheduleIgnoringPreset = useCallback(async (tasksToSchedule: Task[]): Promise<Task[]> => {
    if (!user || tasksToSchedule.length === 0) return tasksToSchedule;

    setIsScheduling(true);
    try {
      const { scheduled, unscheduled } = scheduleService.scheduleIgnoringPreset(
        tasksToSchedule,
        tasks,
        events,
        energyLevel,
        dateStr
      );

      if (scheduled.length > 0) {
        await taskRepository.bulkUpdate(scheduled);
        await fetchTasks();
        toast.success(`Scheduled ${scheduled.length} tasks (ignoring presets)`);
      }

      if (unscheduled.length > 0) {
        toast.info(`${unscheduled.length} tasks still couldn't be scheduled`);
      }

      return unscheduled;
    } catch (error) {
      console.error('Schedule ignoring preset error:', error);
      toast.error('Failed to schedule tasks');
      return tasksToSchedule;
    } finally {
      setIsScheduling(false);
    }
  }, [user, tasks, events, energyLevel, dateStr, fetchTasks]);

  const scheduleIgnoringAll = useCallback(async (tasksToSchedule: Task[]): Promise<Task[]> => {
    if (!user || tasksToSchedule.length === 0) return tasksToSchedule;

    setIsScheduling(true);
    try {
      const { scheduled, unscheduled } = scheduleService.scheduleIgnoringAll(
        tasksToSchedule,
        tasks,
        events,
        energyLevel,
        dateStr
      );

      if (scheduled.length > 0) {
        await taskRepository.bulkUpdate(scheduled);
        await fetchTasks();
        toast.success(`Scheduled ${scheduled.length} tasks (ignoring all constraints)`);
      }

      if (unscheduled.length > 0) {
        toast.info(`${unscheduled.length} tasks still couldn't be scheduled`);
      }

      return unscheduled;
    } catch (error) {
      console.error('Schedule ignoring all error:', error);
      toast.error('Failed to schedule tasks');
      return tasksToSchedule;
    } finally {
      setIsScheduling(false);
    }
  }, [user, tasks, events, energyLevel, dateStr, fetchTasks]);

  const findNextSlotToday = useCallback((
    duration: number,
    windows: AvailabilityWindows
  ): string | null => {
    return scheduleService.findNextSlot(dateStr, duration, windows, events, tasks);
  }, [dateStr, events, tasks]);

  const findNextSlotTomorrow = useCallback((
    duration: number,
    windows: AvailabilityWindows
  ): { date: string; time: string } | null => {
    const tomorrow = addDays(selectedDate, 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    const time = scheduleService.findNextSlot(tomorrowStr, duration, windows, events, tasks);
    if (time) {
      return { date: tomorrowStr, time };
    }
    return null;
  }, [selectedDate, events, tasks]);

  const isTimeInPast = useCallback((time: string): boolean => {
    return scheduleService.isTimeInPast(time, dateStr);
  }, [dateStr]);

  return {
    isScheduling,
    autoSchedule,
    autoScheduleSelected,
    autoScheduleBacklog,
    scheduleForNextDay,
    scheduleIgnoringPreset,
    scheduleIgnoringAll,
    findNextSlotToday,
    findNextSlotTomorrow,
    isTimeInPast,
  };
}
