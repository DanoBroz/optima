import type { DailyEnergy } from '@/types/task';
import type { EnergyRow, EnergyInsert } from '@/types/supabase';
import { supabase } from '@/lib/supabase';

// Convert DB row to app DailyEnergy type
const toEnergy = (row: EnergyRow): DailyEnergy => ({
  id: row.id,
  user_id: row.user_id,
  date: row.date,
  energy_level: row.energy_level,
  notes: row.notes,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const energyRepository = {
  async getByDate(dateStr: string): Promise<DailyEnergy | undefined> {
    const { data, error } = await supabase
      .from('daily_energy')
      .select('*')
      .eq('date', dateStr)
      .maybeSingle();

    if (error) throw error;
    return data ? toEnergy(data as EnergyRow) : undefined;
  },

  async add(entry: DailyEnergy): Promise<void> {
    const insertData: EnergyInsert = {
      id: entry.id,
      user_id: entry.user_id,
      date: entry.date,
      energy_level: entry.energy_level,
      notes: entry.notes,
    };

    const { error } = await supabase.from('daily_energy').insert(insertData as never);
    if (error) throw error;
  },

  async update(id: string, updates: Partial<DailyEnergy>): Promise<void> {
    const { error } = await supabase
      .from('daily_energy')
      .update(updates as never)
      .eq('id', id);

    if (error) throw error;
  },
};
