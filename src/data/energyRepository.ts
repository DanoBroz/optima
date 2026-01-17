import type { DailyEnergy } from '@/types/task';
import { db } from '@/db/database';

export const energyRepository = {
  async getByDate(dateStr: string): Promise<DailyEnergy | undefined> {
    return db.daily_energy.where('date').equals(dateStr).first();
  },
  async add(entry: DailyEnergy): Promise<void> {
    await db.daily_energy.add(entry);
  },
  async update(id: string, updates: Partial<DailyEnergy>): Promise<void> {
    await db.daily_energy.update(id, updates);
  },
};
