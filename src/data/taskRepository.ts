import type { Task } from '@/types/task';
import type { TaskRow, TaskInsert } from '@/types/supabase';
import { supabase } from '@/lib/supabase';

// Convert DB row to app Task type (they're compatible, just need user_id handling)
const toTask = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  description: row.description,
  completed: row.completed,
  scheduled_time: row.scheduled_time,
  scheduled_date: row.scheduled_date,
  duration: row.duration,
  priority: row.priority,
  energy_level: row.energy_level,
  motivation_level: row.motivation_level,
  availability_preset: (row as TaskRow & { availability_preset?: string }).availability_preset as Task['availability_preset'] || 'any',
  is_locked: row.is_locked,
  order_index: row.order_index,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const taskRepository = {
  async getAll(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as TaskRow[]).map(toTask);
  },

  async add(task: Task): Promise<void> {
    const insertData: TaskInsert = {
      id: task.id,
      title: task.title,
      description: task.description,
      completed: task.completed,
      scheduled_time: task.scheduled_time,
      scheduled_date: task.scheduled_date,
      duration: task.duration,
      priority: task.priority,
      energy_level: task.energy_level,
      motivation_level: task.motivation_level,
      availability_preset: task.availability_preset,
      is_locked: task.is_locked,
      order_index: task.order_index,
    } as TaskInsert;

    const { error } = await supabase.from('tasks').insert(insertData as never);
    if (error) throw error;
  },

  async update(id: string, updates: Partial<Task>): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update(updates as never)
      .eq('id', id);

    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  },

  async bulkUpdate(tasks: Task[]): Promise<void> {
    // Process updates in parallel
    await Promise.all(
      tasks.map((task) =>
        supabase
          .from('tasks')
          .update({
            scheduled_time: task.scheduled_time,
            scheduled_date: task.scheduled_date,
          } as never)
          .eq('id', task.id)
      )
    );
  },
};
