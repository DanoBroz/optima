import { useState, useEffect, useCallback } from 'react';
import type { Task, CalendarEvent, DayCapacity, DailyEnergy, DailyEnergyLevel, MotivationLevel } from '@/types/task';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function useTasks(selectedDate: Date = new Date()) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dailyEnergy, setDailyEnergy] = useState<DailyEnergy | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Fetch tasks for the selected date
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .or(`scheduled_date.eq.${dateStr},scheduled_date.is.null`)
        .order('order_index', { ascending: true });

      if (error) throw error;
      
      // Map database fields to our Task type
      const mappedTasks: Task[] = (data || []).map(t => ({
        id: t.id,
        user_id: t.user_id,
        title: t.title,
        description: t.description,
        completed: t.completed,
        scheduled_time: t.scheduled_time,
        scheduled_date: t.scheduled_date,
        duration: t.duration || 30,
        priority: t.priority as 'low' | 'medium' | 'high',
        energy_level: (t.energy_level || 'medium') as 'low' | 'medium' | 'high',
        motivation_level: (t.motivation_level || 'neutral') as MotivationLevel,
        is_locked: t.is_locked,
        order_index: t.order_index,
        created_at: t.created_at,
        updated_at: t.updated_at
      }));
      
      setTasks(mappedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [user, dateStr]);

  // Fetch calendar events
  const fetchEvents = useCallback(async () => {
    if (!user) return;
    
    try {
      const startOfDay = `${dateStr}T00:00:00Z`;
      const endOfDay = `${dateStr}T23:59:59Z`;
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay);

      if (error) throw error;
      
      const mappedEvents: CalendarEvent[] = (data || []).map(e => ({
        id: e.id,
        user_id: e.user_id,
        title: e.title,
        start_time: e.start_time,
        end_time: e.end_time,
        is_external: e.is_external,
        external_id: e.external_id,
        calendar_source: e.calendar_source,
        location: e.location,
        energy_level: (e.energy_level || 'medium') as 'low' | 'medium' | 'high',
        energy_drain: e.energy_drain,
        created_at: e.created_at,
        updated_at: e.updated_at
      }));
      
      setEvents(mappedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, [user, dateStr]);

  // Fetch daily energy
  const fetchDailyEnergy = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('daily_energy')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setDailyEnergy({
          id: data.id,
          user_id: data.user_id,
          date: data.date,
          energy_level: data.energy_level as DailyEnergyLevel,
          notes: data.notes,
          created_at: data.created_at,
          updated_at: data.updated_at
        });
      } else {
        setDailyEnergy(null);
      }
    } catch (error) {
      console.error('Error fetching daily energy:', error);
    }
  }, [user, dateStr]);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchEvents();
      fetchDailyEnergy();
    }
  }, [user, fetchTasks, fetchEvents, fetchDailyEnergy]);

  // Set daily energy level
  const setDailyEnergyLevel = async (level: DailyEnergyLevel, notes?: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('daily_energy')
        .upsert({
          user_id: user.id,
          date: dateStr,
          energy_level: level,
          notes
        }, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (error) throw error;
      
      setDailyEnergy({
        id: data.id,
        user_id: data.user_id,
        date: data.date,
        energy_level: data.energy_level as DailyEnergyLevel,
        notes: data.notes,
        created_at: data.created_at,
        updated_at: data.updated_at
      });
      toast.success('Energy level updated');
    } catch (error) {
      console.error('Error setting daily energy:', error);
      toast.error('Failed to update energy level');
    }
  };

  // Add task
  const addTask = async (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: task.title,
          description: task.description,
          completed: task.completed,
          scheduled_time: task.scheduled_time,
          scheduled_date: task.scheduled_date,
          duration: task.duration,
          priority: task.priority,
          energy_level: task.energy_level,
          motivation_level: task.motivation_level,
          is_locked: task.is_locked,
          order_index: tasks.length
        })
        .select()
        .single();

      if (error) throw error;
      
      const newTask: Task = {
        id: data.id,
        user_id: data.user_id,
        title: data.title,
        description: data.description,
        completed: data.completed,
        scheduled_time: data.scheduled_time,
        scheduled_date: data.scheduled_date,
        duration: data.duration || 30,
        priority: data.priority as 'low' | 'medium' | 'high',
        energy_level: (data.energy_level || 'medium') as 'low' | 'medium' | 'high',
        motivation_level: (data.motivation_level || 'neutral') as MotivationLevel,
        is_locked: data.is_locked,
        order_index: data.order_index,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      
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
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', id);

      if (error) throw error;
      
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
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
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
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
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
      scheduled_time: undefined, 
      scheduled_date: tomorrowStr,
      is_locked: false 
    });
    toast.success('Task moved to tomorrow');
  };

  // Auto-schedule tasks using AI
  const autoSchedule = async () => {
    if (!user) return;

    setIsScheduling(true);
    try {
      const unscheduledTasks = tasks.filter(t => !t.scheduled_time && !t.completed);
      
      if (unscheduledTasks.length === 0) {
        toast.info('No tasks to schedule');
        return;
      }

      const { data, error } = await supabase.functions.invoke('auto-schedule', {
        body: {
          tasks: tasks.filter(t => !t.completed),
          events: events,
          work_start: '09:00',
          work_end: '17:00',
          target_date: dateStr,
          daily_energy: dailyEnergy?.energy_level || 'medium'
        }
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('Too many requests. Please wait a moment.');
        } else if (data.error.includes('credits')) {
          toast.error('AI credits exhausted. Please add credits.');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      // Update tasks with new schedules
      const updates = data.updates || [];
      for (const update of updates) {
        await supabase
          .from('tasks')
          .update({ 
            scheduled_time: update.scheduled_time, 
            scheduled_date: dateStr 
          })
          .eq('id', update.id);
      }

      // Refresh tasks
      await fetchTasks();
      toast.success(`Scheduled ${updates.length} tasks`);
    } catch (error) {
      console.error('Auto-schedule error:', error);
      toast.error('Failed to auto-schedule tasks');
    } finally {
      setIsScheduling(false);
    }
  };

  // Add calendar event
  const addEvent = async (event: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          user_id: user.id,
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          is_external: event.is_external,
          location: event.location,
          energy_level: event.energy_level || 'medium',
          energy_drain: event.energy_drain
        })
        .select()
        .single();

      if (error) throw error;
      
      const newEvent: CalendarEvent = {
        id: data.id,
        user_id: data.user_id,
        title: data.title,
        start_time: data.start_time,
        end_time: data.end_time,
        is_external: data.is_external,
        external_id: data.external_id,
        calendar_source: data.calendar_source,
        location: data.location,
        energy_level: (data.energy_level || 'medium') as 'low' | 'medium' | 'high',
        energy_drain: data.energy_drain,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      
      setEvents(prev => [...prev, newEvent]);
      toast.success('Event added');
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    }
  };

  // Calculate capacity based on energy level
  // 16 waking hours - essentials (eating, hygiene, rest) = productive hours
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
    getCapacity,
    setDailyEnergyLevel,
    refetch: fetchTasks
  };
}
