import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Task, CalendarEvent, DailyEnergy, DailyEnergyLevel, AvailabilityPreset } from '@/types/task';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { taskRepository } from '@/data/taskRepository';
import { eventRepository } from '@/data/eventRepository';
import { energyRepository } from '@/data/energyRepository';
import { scheduleService } from '@/services/scheduleService';
import { calculateCapacity } from '@/services/capacityService';
import { getDayTimeRange } from '@/utils/time';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_DAILY_ENERGY: DailyEnergyLevel = 'medium';

const createTimestamp = () => new Date().toISOString();

export function useTasks(selectedDate: Date = new Date()) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dailyEnergy, setDailyEnergy] = useState<DailyEnergy | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const allTasks = await taskRepository.getAll();
      const filteredTasks = allTasks.filter(
        task => task.scheduled_date === dateStr || task.scheduled_date === null
      );
      setTasks(filteredTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  const fetchEvents = useCallback(async () => {
    try {
      const { startOfDay, endOfDay } = getDayTimeRange(dateStr);
      const allEvents = await eventRepository.getAll();
      const filteredEvents = allEvents.filter(
        event => event.start_time >= startOfDay && event.start_time <= endOfDay
      );
      setEvents(filteredEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, [dateStr]);

  const fetchDailyEnergy = useCallback(async () => {
    try {
      const energy = await energyRepository.getByDate(dateStr);
      setDailyEnergy(energy || null);
    } catch (error) {
      console.error('Error fetching daily energy:', error);
    }
  }, [dateStr]);

  useEffect(() => {
    fetchTasks();
    fetchEvents();
    fetchDailyEnergy();
  }, [fetchTasks, fetchEvents, fetchDailyEnergy]);

  const setDailyEnergyLevel = async (level: DailyEnergyLevel, notes?: string) => {
    if (!user) {
      toast.error('Please sign in to update energy');
      return;
    }

    try {
      const timestamp = createTimestamp();
      const energyData: DailyEnergy = {
        id: self.crypto.randomUUID(),
        user_id: user.id,
        date: dateStr,
        energy_level: level,
        notes: notes || null,
        created_at: timestamp,
        updated_at: timestamp,
      };

      const existing = await energyRepository.getByDate(dateStr);

      if (existing) {
        await energyRepository.update(existing.id, {
          energy_level: level,
          notes: notes || null,
          updated_at: timestamp,
        });
        setDailyEnergy({ ...existing, energy_level: level, notes: notes || null });
      } else {
        await energyRepository.add(energyData);
        setDailyEnergy(energyData);
      }

      toast.success('Energy level updated');
    } catch (error) {
      console.error('Error setting daily energy:', error);
      toast.error('Failed to update energy level');
    }
  };

  const addTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      toast.error('Please sign in to create tasks');
      return;
    }

    try {
      const timestamp = createTimestamp();
      const newTask: Task = {
        ...task,
        id: self.crypto.randomUUID(),
        user_id: user.id,
        created_at: timestamp,
        updated_at: timestamp,
      };

      await taskRepository.add(newTask);
      setTasks(prev => [...prev, newTask]);
      toast.success('Task created');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to create task');
    }
  };

  const toggleTask = async (id: string) => {
    if (!user) {
      toast.error('Please sign in to update tasks');
      return;
    }

    const task = tasks.find(item => item.id === id);
    if (!task) return;

    try {
      await taskRepository.update(id, { completed: !task.completed });
      setTasks(prev =>
        prev.map(item => (item.id === id ? { ...item, completed: !item.completed } : item))
      );
    } catch (error) {
      console.error('Error toggling task:', error);
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) {
      toast.error('Please sign in to delete tasks');
      return;
    }

    try {
      await taskRepository.remove(id);
      setTasks(prev => prev.filter(task => task.id !== id));
      toast.success('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!user) {
      toast.error('Please sign in to update tasks');
      return;
    }

    try {
      await taskRepository.update(id, {
        ...updates,
        updated_at: createTimestamp(),
      });

      setTasks(prev => prev.map(task => (task.id === id ? { ...task, ...updates } : task)));
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const rescheduleTask = async (id: string, time: string, date?: string) => {
    if (!user) {
      toast.error('Please sign in to reschedule tasks');
      return;
    }

    await updateTask(id, {
      scheduled_time: time,
      scheduled_date: date || dateStr,
      is_locked: true,
    });
  };

  const deferTask = async (id: string) => {
    if (!user) {
      toast.error('Please sign in to defer tasks');
      return;
    }

    const tomorrow = new Date(selectedDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    await updateTask(id, {
      scheduled_time: null,
      scheduled_date: tomorrowStr,
      is_locked: false,
    });
    toast.success('Task moved to tomorrow');
  };

  const autoSchedule = async (): Promise<{ scheduled: Task[]; unscheduled: Task[] }> => {
    if (!user) {
      toast.error('Please sign in to schedule tasks');
      return { scheduled: [], unscheduled: [] };
    }

    // Get all unlocked, incomplete tasks that could be (re)scheduled:
    // - Unlocked tasks scheduled for today (will be rescheduled to optimal slots)
    // - Unscheduled backlog tasks (will be scheduled)
    const tasksToOptimize = tasks.filter(task =>
      !task.is_locked &&
      !task.completed &&
      (!task.scheduled_time || task.scheduled_date === dateStr)
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
        dailyEnergy?.energy_level || DEFAULT_DAILY_ENERGY,
        dateStr
      );

      // Find which tasks could not be scheduled
      const scheduledIds = new Set(scheduledTasks.map(t => t.id));
      const unscheduledTasks = tasksToOptimize.filter(t => !scheduledIds.has(t.id));

      if (scheduledTasks.length > 0) {
        await taskRepository.bulkUpdate(scheduledTasks);
        await fetchTasks();
      }

      // Show toast only for fully successful optimization
      if (scheduledTasks.length > 0 && unscheduledTasks.length === 0) {
        toast.success(`Optimized ${scheduledTasks.length} tasks`);
      } else if (scheduledTasks.length > 0 && unscheduledTasks.length > 0) {
        toast.success(`Scheduled ${scheduledTasks.length} tasks`);
      }
      // Don't show toast for unscheduled - let the UI handle it via modal

      return { scheduled: scheduledTasks, unscheduled: unscheduledTasks };
    } catch (error) {
      console.error('Auto-schedule error:', error);
      // On error, return all tasks as unscheduled so modal can show
      return { scheduled: [], unscheduled: tasksToOptimize };
    } finally {
      setIsScheduling(false);
    }
  };

  const autoScheduleSelected = async (selectedIds: string[]): Promise<{ scheduled: Task[]; unscheduled: Task[] }> => {
    if (!user) {
      toast.error('Please sign in to schedule tasks');
      return { scheduled: [], unscheduled: [] };
    }

    if (selectedIds.length === 0) {
      toast.info('No tasks selected');
      return { scheduled: [], unscheduled: [] };
    }

    // Get selected tasks before try block so we can return them on error
    const selectedTasks = tasks.filter(
      t => selectedIds.includes(t.id) && !t.completed && !t.is_locked && !t.scheduled_time
    );

    setIsScheduling(true);
    try {
      const scheduledTasks = scheduleService.autoScheduleSelected(
        tasks,
        selectedIds,
        events,
        dailyEnergy?.energy_level || DEFAULT_DAILY_ENERGY,
        dateStr
      );

      // Find which selected tasks were not scheduled
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
      // Don't show toast for unscheduled - let the UI handle it via modal

      return { scheduled: scheduledTasks, unscheduled: unscheduledTasks };
    } catch (error) {
      console.error('Auto-schedule selected error:', error);
      // On error, return all selected tasks as unscheduled so modal can show
      return { scheduled: [], unscheduled: selectedTasks };
    } finally {
      setIsScheduling(false);
    }
  };

  const autoScheduleBacklog = async (): Promise<{ scheduled: Task[]; unscheduled: Task[] }> => {
    if (!user) {
      toast.error('Please sign in to schedule tasks');
      return { scheduled: [], unscheduled: [] };
    }

    const backlogTasks = tasks.filter(
      task => !task.scheduled_time && !task.completed && !task.is_locked
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
        dailyEnergy?.energy_level || DEFAULT_DAILY_ENERGY,
        dateStr
      );

      // Find which backlog tasks were not scheduled
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
      // Don't show toast for unscheduled - let the UI handle it via modal

      return { scheduled: scheduledTasks, unscheduled: unscheduledTasks };
    } catch (error) {
      console.error('Auto-schedule backlog error:', error);
      // On error, return all backlog tasks as unscheduled so modal can show
      return { scheduled: [], unscheduled: backlogTasks };
    } finally {
      setIsScheduling(false);
    }
  };

  const moveToBacklog = async (id: string) => {
    if (!user) {
      toast.error('Please sign in to update tasks');
      return;
    }

    const task = tasks.find(item => item.id === id);
    if (!task) return;

    if (task.completed) {
      toast.error('Cannot move completed tasks to backlog');
      return;
    }

    await updateTask(id, {
      scheduled_time: null,
      scheduled_date: null,
      is_locked: false,
    });
    toast.success('Task moved to backlog');
  };

  const toggleLock = async (id: string) => {
    if (!user) {
      toast.error('Please sign in to update tasks');
      return;
    }

    const task = tasks.find(item => item.id === id);
    if (!task) return;

    if (task.completed) {
      toast.error('Cannot lock/unlock completed tasks');
      return;
    }

    await updateTask(id, {
      is_locked: !task.is_locked,
    });
    toast.success(task.is_locked ? 'Task unlocked' : 'Task locked');
  };

  const findNextSlotToday = (
    duration: number,
    preset: AvailabilityPreset
  ): string | null => {
    return scheduleService.findNextSlot(dateStr, duration, preset, events, tasks);
  };

  const findNextSlotTomorrow = (
    duration: number,
    preset: AvailabilityPreset
  ): { date: string; time: string } | null => {
    const tomorrow = addDays(selectedDate, 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    const time = scheduleService.findNextSlot(tomorrowStr, duration, preset, events, tasks);
    if (time) {
      return { date: tomorrowStr, time };
    }
    return null;
  };

  const isTimeInPast = (time: string): boolean => {
    return scheduleService.isTimeInPast(time, dateStr);
  };

  /**
   * Schedule tasks for next day (respecting constraints)
   * Returns tasks that still couldn't be scheduled
   */
  const scheduleForNextDay = async (tasksToSchedule: Task[]): Promise<Task[]> => {
    if (!user || tasksToSchedule.length === 0) return tasksToSchedule;

    setIsScheduling(true);
    try {
      const { scheduled, unscheduled } = scheduleService.scheduleForNextDay(
        tasksToSchedule,
        tasks,
        events,
        dailyEnergy?.energy_level || DEFAULT_DAILY_ENERGY,
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
  };

  /**
   * Schedule tasks ignoring preset constraints (but respecting work hours)
   * Returns tasks that still couldn't be scheduled
   */
  const scheduleIgnoringPreset = async (tasksToSchedule: Task[]): Promise<Task[]> => {
    if (!user || tasksToSchedule.length === 0) return tasksToSchedule;

    setIsScheduling(true);
    try {
      const { scheduled, unscheduled } = scheduleService.scheduleIgnoringPreset(
        tasksToSchedule,
        tasks,
        events,
        dailyEnergy?.energy_level || DEFAULT_DAILY_ENERGY,
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
  };

  /**
   * Schedule tasks ignoring all constraints (preset + work hours)
   * Returns tasks that still couldn't be scheduled
   */
  const scheduleIgnoringAll = async (tasksToSchedule: Task[]): Promise<Task[]> => {
    if (!user || tasksToSchedule.length === 0) return tasksToSchedule;

    setIsScheduling(true);
    try {
      const { scheduled, unscheduled } = scheduleService.scheduleIgnoringAll(
        tasksToSchedule,
        tasks,
        events,
        dailyEnergy?.energy_level || DEFAULT_DAILY_ENERGY,
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
  };

  const addEvent = async (
    event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user) {
      toast.error('Please sign in to add events');
      return;
    }

    try {
      const timestamp = createTimestamp();
      const newEvent: CalendarEvent = {
        ...event,
        id: self.crypto.randomUUID(),
        user_id: user.id,
        created_at: timestamp,
        updated_at: timestamp,
      };

      await eventRepository.add(newEvent);
      setEvents(prev => [...prev, newEvent]);
      toast.success('Event added');
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    }
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    if (!user) {
      toast.error('Please sign in to update events');
      return;
    }

    try {
      await eventRepository.update(id, {
        ...updates,
        updated_at: createTimestamp(),
      });

      setEvents(prev => prev.map(event => (event.id === id ? { ...event, ...updates } : event)));
      toast.success('Event updated');
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  };

  const deleteEvent = async (id: string) => {
    if (!user) {
      toast.error('Please sign in to delete events');
      return;
    }

    try {
      await eventRepository.remove(id);
      setEvents(prev => prev.filter(event => event.id !== id));
      toast.success('Event deleted');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const importEvents = async (
    eventsToImport: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[]
  ) => {
    if (!user) {
      toast.error('Please sign in to import events');
      return;
    }

    try {
      const timestamp = createTimestamp();
      const newEvents: CalendarEvent[] = eventsToImport.map(event => ({
        ...event,
        id: self.crypto.randomUUID(),
        user_id: user.id,
        created_at: timestamp,
        updated_at: timestamp,
      }));

      await eventRepository.bulkAdd(newEvents);
      setEvents(prev => [...prev, ...newEvents]);
      toast.success(`Imported ${newEvents.length} events`);
    } catch (error) {
      console.error('Error importing events:', error);
      toast.error('Failed to import events');
      throw error;
    }
  };

  const capacity = useMemo(
    () => calculateCapacity(tasks, events, dailyEnergy?.energy_level),
    [tasks, events, dailyEnergy]
  );

  const scheduledTasks = useMemo(() => tasks.filter(task => task.scheduled_time), [tasks]);
  const unscheduledTasks = useMemo(() => tasks.filter(task => !task.scheduled_time), [tasks]);

  return {
    tasks,
    scheduledTasks,
    unscheduledTasks,
    events,
    dailyEnergy,
    loading,
    isScheduling,
    capacity,
    actions: {
      task: {
        add: addTask,
        toggle: toggleTask,
        remove: deleteTask,
        update: updateTask,
        reschedule: rescheduleTask,
        defer: deferTask,
        autoSchedule,
        autoScheduleSelected,
        autoScheduleBacklog,
        moveToBacklog,
        toggleLock,
      },
      event: {
        add: addEvent,
        update: updateEvent,
        remove: deleteEvent,
        import: importEvents,
      },
      energy: {
        setLevel: setDailyEnergyLevel,
      },
      refresh: {
        tasks: fetchTasks,
        events: fetchEvents,
        energy: fetchDailyEnergy,
      },
      scheduling: {
        findNextSlotToday,
        findNextSlotTomorrow,
        isTimeInPast,
        scheduleForNextDay,
        scheduleIgnoringPreset,
        scheduleIgnoringAll,
      },
    },
  };
}
