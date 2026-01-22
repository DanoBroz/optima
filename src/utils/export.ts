import { taskRepository } from '@/data/taskRepository';
import { eventRepository } from '@/data/eventRepository';
import { supabase } from '@/lib/supabase';

export const exportAllData = async () => {
  const tasks = await taskRepository.getAll();
  const events = await eventRepository.getAll();

  // Get all daily energy records
  const { data: energyData, error } = await supabase
    .from('daily_energy')
    .select('*');

  if (error) throw error;

  const backup = {
    version: 1,
    exported_at: new Date().toISOString(),
    tasks,
    calendar_events: events,
    daily_energy: energyData ?? [],
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scheduler-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

interface BackupData {
  version: number;
  tasks?: Array<{
    id: string;
    title: string;
    description?: string | null;
    completed: boolean;
    scheduled_time?: string | null;
    scheduled_date?: string | null;
    duration: number;
    priority: 'low' | 'medium' | 'high';
    energy_level: 'low' | 'medium' | 'high';
    motivation_level: 'hate' | 'dislike' | 'neutral' | 'like' | 'love';
    is_locked: boolean;
    order_index: number;
    created_at?: string;
    updated_at?: string;
  }>;
  calendar_events?: Array<{
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    is_external: boolean;
    external_id?: string | null;
    calendar_source?: string | null;
    location?: string | null;
    energy_level?: 'restful' | 'low' | 'medium' | 'high';
    energy_drain?: number | null;
    created_at?: string;
    updated_at?: string;
  }>;
  daily_energy?: Array<{
    id: string;
    date: string;
    energy_level: 'exhausted' | 'low' | 'medium' | 'high' | 'energized';
    notes?: string | null;
    created_at?: string;
    updated_at?: string;
  }>;
}

export const importData = async (file: File) => {
  const text = await file.text();
  const backup: BackupData = JSON.parse(text);

  // Import tasks
  if (backup.tasks && backup.tasks.length > 0) {
    const { error: tasksError } = await supabase
      .from('tasks')
      .insert(backup.tasks as never);
    if (tasksError) throw tasksError;
  }

  // Import calendar events
  if (backup.calendar_events && backup.calendar_events.length > 0) {
    const { error: eventsError } = await supabase
      .from('calendar_events')
      .insert(backup.calendar_events as never);
    if (eventsError) throw eventsError;
  }

  // Import daily energy
  if (backup.daily_energy && backup.daily_energy.length > 0) {
    const { error: energyError } = await supabase
      .from('daily_energy')
      .insert(backup.daily_energy as never);
    if (energyError) throw energyError;
  }
};
