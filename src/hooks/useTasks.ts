import { useState, useEffect, useCallback } from 'react';
import type { Task, CalendarEvent, DayCapacity, DailyEnergy, DailyEnergyLevel } from '@/types/task';
import { db } from '@/db/database';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { autoScheduleTasks } from '@/utils/autoSchedule';
import { getSettings } from '@/utils/settings';

export function useTasks(selectedDate: Date = new Date()) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dailyEnergy, setDailyEnergy] = useState<DailyEnergy | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Fetch tasks for the selected date
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      // Get all tasks (scheduled for this date or unscheduled)
      const allTasks = await db.tasks.toArray();
      const filteredTasks = allTasks.filter(
        t => t.scheduled_date === dateStr || t.scheduled_date === null
      );

      setTasks(filteredTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  // Fetch calendar events
  const fetchEvents = useCallback(async () => {
    try {
      const startOfDay = `${dateStr}T00:00:00Z`;
      const endOfDay = `${dateStr}T23:59:59Z`;

      const allEvents = await db.calendar_events.toArray();
      const filteredEvents = allEvents.filter(e => {
        return e.start_time >= startOfDay && e.start_time <= endOfDay;
      });

      setEvents(filteredEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, [dateStr]);

  // Fetch daily energy
  const fetchDailyEnergy = useCallback(async () => {
    try {
      const energy = await db.daily_energy.where('date').equals(dateStr).first();
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

  // Set daily energy level
  const setDailyEnergyLevel = async (level: DailyEnergyLevel, notes?: string) => {
    try {
      const energyData: DailyEnergy = {
        id: self.crypto.randomUUID(),
        date: dateStr,
        energy_level: level,
        notes: notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Check if already exists
      const existing = await db.daily_energy.where('date').equals(dateStr).first();

      if (existing) {
        await db.daily_energy.update(existing.id, {
          energy_level: level,
          notes: notes || null,
          updated_at: new Date().toISOString()
        });
        setDailyEnergy({ ...existing, energy_level: level, notes: notes || null });
      } else {
        await db.daily_energy.add(energyData);
        setDailyEnergy(energyData);
      }

      toast.success('Energy level updated');
    } catch (error) {
      console.error('Error setting daily energy:', error);
      toast.error('Failed to update energy level');
    }
  };

  // Add task
  const addTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newTask: Task = {
        ...task,
        id: self.crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await db.tasks.add(newTask);
      setTasks(prev => [...prev, newTask]);
      toast.success('Task created');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to create task');
    }
  };

  // Toggle task completion
  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
      await db.tasks.update(id, { completed: !task.completed });
      setTasks(prev =>
        prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      );
    } catch (error) {
      console.error('Error toggling task:', error);
      toast.error('Failed to update task');
    }
  };

  // Delete task
  const deleteTask = async (id: string) => {
    try {
      await db.tasks.delete(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  // Update task
  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      await db.tasks.update(id, {
        ...updates,
        updated_at: new Date().toISOString()
      });

      setTasks(prev =>
        prev.map(t => t.id === id ? { ...t, ...updates } : t)
      );
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  // Reschedule task to a specific time
  const rescheduleTask = async (id: string, time: string, date?: string) => {
    await updateTask(id, {
      scheduled_time: time,
      scheduled_date: date || dateStr,
      is_locked: true
    });
  };

  // Defer task to tomorrow
  const deferTask = async (id: string) => {
    const tomorrow = new Date(selectedDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    await updateTask(id, {
      scheduled_time: null,
      scheduled_date: tomorrowStr,
      is_locked: false
    });
    toast.success('Task moved to tomorrow');
  };

  // Auto-schedule tasks using local algorithm
  const autoSchedule = async () => {
    setIsScheduling(true);
    try {
      const unscheduledTasks = tasks.filter(t => !t.scheduled_time && !t.completed);

      if (unscheduledTasks.length === 0) {
        toast.info('No tasks to schedule');
        return;
      }

      const settings = getSettings();
      const scheduledTasks = autoScheduleTasks(
        tasks,
        events,
        settings.work_start_time,
        settings.work_end_time,
        dailyEnergy?.energy_level || 'medium',
        dateStr
      );

      // Update tasks in IndexedDB
      for (const task of scheduledTasks) {
        await db.tasks.update(task.id, {
          scheduled_time: task.scheduled_time,
          scheduled_date: task.scheduled_date
        });
      }

      // Refresh tasks
      await fetchTasks();
      toast.success(`Scheduled ${scheduledTasks.length} tasks`);
    } catch (error) {
      console.error('Auto-schedule error:', error);
      toast.error('Failed to auto-schedule tasks');
    } finally {
      setIsScheduling(false);
    }
  };

  // Add calendar event
  const addEvent = async (event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newEvent: CalendarEvent = {
        ...event,
        id: self.crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await db.calendar_events.add(newEvent);
      setEvents(prev => [...prev, newEvent]);
      toast.success('Event added');
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    }
  };

  // Update calendar event
  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    try {
      await db.calendar_events.update(id, {
        ...updates,
        updated_at: new Date().toISOString()
      });

      setEvents(prev =>
        prev.map(e => e.id === id ? { ...e, ...updates } : e)
      );
      toast.success('Event updated');
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  };

  // Delete calendar event
  const deleteEvent = async (id: string) => {
    try {
      await db.calendar_events.delete(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      toast.success('Event deleted');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  // Bulk import calendar events
  const importEvents = async (events: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      const newEvents: CalendarEvent[] = events.map(event => ({
        ...event,
        id: self.crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      await db.calendar_events.bulkAdd(newEvents);
      setEvents(prev => [...prev, ...newEvents]);
      toast.success(`Imported ${newEvents.length} events`);
    } catch (error) {
      console.error('Error importing events:', error);
      toast.error('Failed to import events');
      throw error;
    }
  };

  // Calculate capacity based on energy level
  const getCapacity = (): DayCapacity => {
    const wakingHours = 16 * 60; // 16 hours awake (24 - 8 sleep)

    // Essential activities baseline (eating, hygiene, commute, breaks)
    const essentialMinutes = 3 * 60; // ~3 hours for essentials

    // Energy affects how much productive time you have
    const energyMultiplier: Record<DailyEnergyLevel, number> = {
      exhausted: 0.3,  // Only 30% productivity - need lots of rest
      low: 0.5,        // 50% - take it easy
      medium: 0.7,     // 70% - normal day
      high: 0.85,      // 85% - good energy
      energized: 1.0,  // 100% - peak performance
    };

    const currentEnergy = dailyEnergy?.energy_level || 'medium';
    const multiplier = energyMultiplier[currentEnergy];

    // Available productive time = (waking - essentials) × energy multiplier
    const baseProductiveMinutes = wakingHours - essentialMinutes;
    const totalMinutes = Math.round(baseProductiveMinutes * multiplier);

    const scheduledMinutes = tasks
      .filter(t => t.scheduled_time && !t.completed)
      .reduce((acc, t) => acc + t.duration, 0);

    // Calculate event drain based on energy_level or custom energy_drain
    const drainMultipliers = { low: 0.5, medium: 1.0, high: 1.5 };
    const eventMinutes = events.reduce((acc, e) => {
      const start = new Date(e.start_time);
      const end = new Date(e.end_time);
      const durationMinutes = (end.getTime() - start.getTime()) / 60000;

      // Use custom drain if set, otherwise calculate based on energy level
      if (e.energy_drain !== undefined && e.energy_drain !== null) {
        return acc + e.energy_drain;
      }

      const eventEnergy = (e.energy_level || 'medium') as 'low' | 'medium' | 'high';
      return acc + Math.round(durationMinutes * drainMultipliers[eventEnergy]);
    }, 0);

    const usedMinutes = scheduledMinutes + eventMinutes;
    const available = Math.max(0, totalMinutes - usedMinutes);

    return {
      total: totalMinutes,
      scheduled: usedMinutes,
      available,
      percentage: Math.round((usedMinutes / totalMinutes) * 100)
    };
  };

  // Filter tasks
  const scheduledTasks = tasks.filter(t => t.scheduled_time);
  const unscheduledTasks = tasks.filter(t => !t.scheduled_time);

  return {
    tasks,
    scheduledTasks,
    unscheduledTasks,
    events,
    dailyEnergy,
    loading,
    isScheduling,
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    rescheduleTask,
    deferTask,
    autoSchedule,
    addEvent,
    updateEvent,
    deleteEvent,
    importEvents,
    getCapacity,
    setDailyEnergyLevel,
    refetch: fetchTasks
  };
}
