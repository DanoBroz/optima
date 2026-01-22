import type { CalendarEvent } from '@/types/task';
import type { EventRow, EventInsert } from '@/types/supabase';
import { supabase } from '@/lib/supabase';

// Convert DB row to app CalendarEvent type
const toEvent = (row: EventRow): CalendarEvent => ({
  id: row.id,
  user_id: row.user_id,
  title: row.title,
  start_time: row.start_time,
  end_time: row.end_time,
  is_external: row.is_external,
  external_id: row.external_id,
  calendar_source: row.calendar_source,
  location: row.location,
  energy_level: row.energy_level ?? undefined,
  energy_drain: row.energy_drain,
  is_dismissed: row.is_dismissed,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const eventRepository = {
  async getAll(): Promise<CalendarEvent[]> {
    // Supabase defaults to 1000 rows - we need more for expanded recurring events
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('start_time', { ascending: true })
      .limit(10000);

    if (error) throw error;
    return ((data ?? []) as EventRow[]).map(toEvent);
  },

  async getByDateRange(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    // Filter on server to avoid fetching all events
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as EventRow[]).map(toEvent);
  },

  async getExistingExternalIds(): Promise<Set<string>> {
    // Get all external_ids to detect duplicates during sync
    const { data, error } = await supabase
      .from('calendar_events')
      .select('external_id')
      .not('external_id', 'is', null);

    if (error) throw error;
    const ids = (data ?? [])
      .map(row => row.external_id)
      .filter((id): id is string => id !== null);
    return new Set(ids);
  },

  async add(event: CalendarEvent): Promise<void> {
    const insertData: EventInsert = {
      id: event.id,
      user_id: event.user_id,
      title: event.title,
      start_time: event.start_time,
      end_time: event.end_time,
      is_external: event.is_external,
      external_id: event.external_id,
      calendar_source: event.calendar_source,
      location: event.location,
      energy_level: event.energy_level,
      energy_drain: event.energy_drain,
    };

    const { error } = await supabase.from('calendar_events').insert(insertData as never);
    if (error) throw error;
  },

  async update(id: string, updates: Partial<CalendarEvent>): Promise<void> {
    const { error } = await supabase
      .from('calendar_events')
      .update(updates as never)
      .eq('id', id);

    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async bulkAdd(events: CalendarEvent[]): Promise<void> {
    if (events.length === 0) return;

    const insertData: EventInsert[] = events.map((event) => ({
      id: event.id,
      user_id: event.user_id,
      title: event.title,
      start_time: event.start_time,
      end_time: event.end_time,
      is_external: event.is_external,
      external_id: event.external_id,
      calendar_source: event.calendar_source,
      location: event.location,
      energy_level: event.energy_level,
      energy_drain: event.energy_drain,
    }));

    const { error } = await supabase.from('calendar_events').insert(insertData as never);
    if (error) throw error;
  },
};
