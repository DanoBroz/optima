import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Task, CalendarEvent, DailyEnergy, DailyEnergyLevel } from '@/types/task';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { taskRepository } from '@/data/taskRepository';
import { eventRepository } from '@/data/eventRepository';
import { energyRepository } from '@/data/energyRepository';
import { scheduleService } from '@/services/scheduleService';
import { calculateCapacity } from '@/services/capacityService';
import { getDayTimeRange } from '@/utils/time';

const DEFAULT_DAILY_ENERGY: DailyEnergyLevel = 'medium';

const createTimestamp = () => new Date().toISOString();

export function useTasks(selectedDate: Date = new Date()) {
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
    try {
      const timestamp = createTimestamp();
      const energyData: DailyEnergy = {
        id: self.crypto.randomUUID(),
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
    try {
      const timestamp = createTimestamp();
      const newTask: Task = {
        ...task,
        id: self.crypto.randomUUID(),
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
    await updateTask(id, {
      scheduled_time: time,
      scheduled_date: date || dateStr,
      is_locked: true,
    });
  };

  const deferTask = async (id: string) => {
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

  const autoSchedule = async () => {
    setIsScheduling(true);
    try {
      const unscheduledTasks = tasks.filter(task => !task.scheduled_time && !task.completed);

      if (unscheduledTasks.length === 0) {
        toast.info('No tasks to schedule');
        return;
      }

      const scheduledTasks = scheduleService.autoSchedule(
        tasks,
        events,
        dailyEnergy?.energy_level || DEFAULT_DAILY_ENERGY,
        dateStr
      );

      await taskRepository.bulkUpdate(scheduledTasks);
      await fetchTasks();
      toast.success(`Scheduled ${scheduledTasks.length} tasks`);
    } catch (error) {
      console.error('Auto-schedule error:', error);
      toast.error('Failed to auto-schedule tasks');
    } finally {
      setIsScheduling(false);
    }
  };

  const addEvent = async (
    event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const timestamp = createTimestamp();
      const newEvent: CalendarEvent = {
        ...event,
        id: self.crypto.randomUUID(),
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
    try {
      const timestamp = createTimestamp();
      const newEvents: CalendarEvent[] = eventsToImport.map(event => ({
        ...event,
        id: self.crypto.randomUUID(),
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
    },
  };
}
