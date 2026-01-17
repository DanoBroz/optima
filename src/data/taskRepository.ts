import type { Task } from '@/types/task';
import { db } from '@/db/database';

export const taskRepository = {
  async getAll(): Promise<Task[]> {
    return db.tasks.toArray();
  },
  async add(task: Task): Promise<void> {
    await db.tasks.add(task);
  },
  async update(id: string, updates: Partial<Task>): Promise<void> {
    await db.tasks.update(id, updates);
  },
  async remove(id: string): Promise<void> {
    await db.tasks.delete(id);
  },
  async bulkUpdate(tasks: Task[]): Promise<void> {
    const updates = tasks.map(task =>
      db.tasks.update(task.id, {
        scheduled_time: task.scheduled_time,
        scheduled_date: task.scheduled_date,
      })
    );
    await Promise.all(updates);
  },
};
