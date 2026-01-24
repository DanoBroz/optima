/**
 * Main data orchestration hook - facade composing focused hooks.
 * Maintains identical return interface for backward compatibility.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Task, CalendarEvent, DailyEnergy, DailyEnergyLevel, DayIntention } from '@/types/task';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { eventRepository } from '@/data/eventRepository';
import { energyRepository } from '@/data/energyRepository';
import { taskRepository } from '@/data/taskRepository';
import { calculateCapacity } from '@/services/capacityService';
import { getDayTimeRange } from '@/utils/time';
import { getSettings, saveSettings } from '@/utils/settings';
import { useAuth } from '@/hooks/useAuth';
import { useTaskOperations } from '@/hooks/useTaskOperations';
import { useEventOperations } from '@/hooks/useEventOperations';
import { useScheduling } from '@/hooks/useScheduling';

const createTimestamp = () => new Date().toISOString();

export function useTasks(selectedDate: Date = new Date()) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dailyEnergy, setDailyEnergy] = useState<DailyEnergy | null>(null);
  const [dayIntention, setDayIntentionState] = useState<DayIntention>(() => getSettings().day_intention);
  const [loading, setLoading] = useState(true);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // ─────────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const allTasks = await taskRepository.getAll();
      const filteredTasks = allTasks.filter(task =>
        task.scheduled_date === dateStr ||
        !task.scheduled_date ||
        (task.scheduled_date && task.scheduled_date > dateStr && !task.scheduled_time)
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
      const fetchedEvents = await eventRepository.getByDateRange(startOfDay, endOfDay);

      const startMs = new Date(startOfDay).getTime();
      const endMs = new Date(endOfDay).getTime();
      const filteredEvents = fetchedEvents.filter(event => {
        const eventMs = new Date(event.start_time).getTime();
        return eventMs >= startMs && eventMs <= endMs;
      });

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Energy & Intention
  // ─────────────────────────────────────────────────────────────────────────────

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

  const setDayIntention = (intention: DayIntention) => {
    setDayIntentionState(intention);
    const settings = getSettings();
    saveSettings({ ...settings, day_intention: intention });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Composed Hooks
  // ─────────────────────────────────────────────────────────────────────────────

  const taskOps = useTaskOperations({
    user,
    dateStr,
    selectedDate,
    tasks,
    events,
    setTasks,
  });

  const eventOps = useEventOperations({
    user,
    dateStr,
    setEvents,
    fetchEvents,
  });

  const scheduling = useScheduling({
    user,
    dateStr,
    selectedDate,
    tasks,
    events,
    dailyEnergyLevel: dailyEnergy?.energy_level,
    fetchTasks,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Computed Values
  // ─────────────────────────────────────────────────────────────────────────────

  const capacity = useMemo(
    () => calculateCapacity(tasks, events, dailyEnergy?.energy_level, dayIntention),
    [tasks, events, dailyEnergy, dayIntention]
  );

  const scheduledTasks = useMemo(() => tasks.filter(task => task.scheduled_time), [tasks]);

  const unscheduledTasks = useMemo(() => tasks.filter(task => !task.scheduled_time), [tasks]);

  const todayBacklogTasks = useMemo(() =>
    tasks.filter(task => !task.scheduled_time && task.scheduled_date === dateStr),
    [tasks, dateStr]
  );

  const trueUnscheduledTasks = useMemo(() =>
    tasks.filter(task => !task.scheduled_time && !task.scheduled_date),
    [tasks]
  );

  const deferredTasks = useMemo(() =>
    tasks.filter(task =>
      !task.scheduled_time &&
      task.scheduled_date &&
      task.scheduled_date > dateStr
    ),
    [tasks, dateStr]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Return - Identical interface to original
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    tasks,
    scheduledTasks,
    unscheduledTasks,
    todayBacklogTasks,
    trueUnscheduledTasks,
    deferredTasks,
    events,
    dailyEnergy,
    dayIntention,
    loading,
    isScheduling: scheduling.isScheduling,
    capacity,
    actions: {
      task: {
        add: taskOps.addTask,
        toggle: taskOps.toggleTask,
        remove: taskOps.deleteTask,
        update: taskOps.updateTask,
        reschedule: taskOps.rescheduleTask,
        defer: taskOps.deferTask,
        autoSchedule: scheduling.autoSchedule,
        autoScheduleSelected: scheduling.autoScheduleSelected,
        autoScheduleBacklog: scheduling.autoScheduleBacklog,
        moveToBacklog: taskOps.moveToBacklog,
        scheduleToToday: taskOps.scheduleToToday,
        toggleLock: taskOps.toggleLock,
      },
      event: {
        add: eventOps.addEvent,
        update: eventOps.updateEvent,
        remove: eventOps.deleteEvent,
        import: eventOps.importEvents,
        clearExternal: eventOps.clearExternalEvents,
        applySync: eventOps.applySyncChanges,
      },
      energy: {
        setLevel: setDailyEnergyLevel,
      },
      intention: {
        set: setDayIntention,
      },
      refresh: {
        tasks: fetchTasks,
        events: fetchEvents,
        energy: fetchDailyEnergy,
      },
      scheduling: {
        findNextSlotToday: scheduling.findNextSlotToday,
        findNextSlotTomorrow: scheduling.findNextSlotTomorrow,
        isTimeInPast: scheduling.isTimeInPast,
        scheduleForNextDay: scheduling.scheduleForNextDay,
        scheduleIgnoringPreset: scheduling.scheduleIgnoringPreset,
        scheduleIgnoringAll: scheduling.scheduleIgnoringAll,
      },
    },
  };
}
