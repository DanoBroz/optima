import type { CalendarEvent } from '@/types/task';
import { db } from '@/db/database';

export const eventRepository = {
  async getAll(): Promise<CalendarEvent[]> {
    return db.calendar_events.toArray();
  },
  async add(event: CalendarEvent): Promise<void> {
    await db.calendar_events.add(event);
  },
  async update(id: string, updates: Partial<CalendarEvent>): Promise<void> {
    await db.calendar_events.update(id, updates);
  },
  async remove(id: string): Promise<void> {
    await db.calendar_events.delete(id);
  },
  async bulkAdd(events: CalendarEvent[]): Promise<void> {
    await db.calendar_events.bulkAdd(events);
  },
};
