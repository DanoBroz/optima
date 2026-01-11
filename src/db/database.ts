import Dexie, { type Table } from 'dexie';
import type { Task, CalendarEvent, DailyEnergy } from '@/types/task';

class SchedulerDatabase extends Dexie {
  tasks!: Table<Task>;
  calendar_events!: Table<CalendarEvent>;
  daily_energy!: Table<DailyEnergy>;

  constructor() {
    super('SchedulerDB');

    this.version(1).stores({
      tasks: 'id, scheduled_date, scheduled_time, completed',
      calendar_events: 'id, start_time',
      daily_energy: 'id, date'
    });
  }
}

export const db = new SchedulerDatabase();
