/**
 * Task CRUD operations hook.
 * Handles add, toggle, delete, update, reschedule, defer, moveToBacklog, scheduleToToday, toggleLock.
 */
import { useCallback } from 'react';
import type { Task, CalendarEvent } from '@/types/task';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { taskRepository } from '@/data/taskRepository';
import { scheduleService } from '@/services/scheduleService';
import type { User } from '@supabase/supabase-js';

const createTimestamp = () => new Date().toISOString();

interface UseTaskOperationsParams {
  user: User | null;
  dateStr: string;
  selectedDate: Date;
  tasks: Task[];
  events: CalendarEvent[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

export function useTaskOperations({
  user,
  dateStr,
  selectedDate,
  tasks,
  events,
  setTasks,
}: UseTaskOperationsParams) {
  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
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
  }, [user, setTasks]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
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
  }, [user, setTasks]);

  const toggleTask = useCallback(async (id: string) => {
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
  }, [user, tasks, setTasks]);

  const deleteTask = useCallback(async (id: string) => {
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
  }, [user, setTasks]);

  const rescheduleTask = useCallback(async (id: string, time: string, date?: string) => {
    if (!user) {
      toast.error('Please sign in to reschedule tasks');
      return;
    }

    await updateTask(id, {
      scheduled_time: time,
      scheduled_date: date || dateStr,
      is_locked: true,
    });
  }, [user, dateStr, updateTask]);

  const deferTask = useCallback(async (id: string) => {
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
  }, [user, selectedDate, updateTask]);

  const moveToBacklog = useCallback(async (id: string) => {
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
  }, [user, tasks, updateTask]);

  const scheduleToToday = useCallback(async (id: string) => {
    if (!user) {
      toast.error('Please sign in to schedule tasks');
      return;
    }

    const task = tasks.find(item => item.id === id);
    if (!task) return;

    if (task.completed) {
      toast.error('Cannot schedule completed tasks');
      return;
    }

    const nextSlot = scheduleService.findNextSlot(
      dateStr,
      task.duration,
      task.availability_windows,
      events,
      tasks
    );

    if (nextSlot) {
      await updateTask(id, {
        scheduled_time: nextSlot,
        scheduled_date: dateStr,
        is_locked: false,
      });
      toast.success('Task scheduled for today');
    } else {
      toast.error('No available slot today');
    }
  }, [user, tasks, events, dateStr, updateTask]);

  const toggleLock = useCallback(async (id: string) => {
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
  }, [user, tasks, updateTask]);

  return {
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    rescheduleTask,
    deferTask,
    moveToBacklog,
    scheduleToToday,
    toggleLock,
  };
}
