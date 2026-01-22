export type MotivationLevel = 'hate' | 'dislike' | 'neutral' | 'like' | 'love';
export type DailyEnergyLevel = 'exhausted' | 'low' | 'medium' | 'high' | 'energized';
export type AvailabilityPreset = 'any' | 'morning' | 'afternoon' | 'evening';
export type DayIntention = 'push' | 'balance' | 'recovery';

export interface Task {
  id: string;
  user_id?: string;
  title: string;
  description?: string | null;
  completed: boolean;
  scheduled_time?: string | null; // HH:MM format
  scheduled_date?: string | null; // YYYY-MM-DD format
  duration: number; // in minutes
  priority: 'low' | 'medium' | 'high';
  energy_level: 'low' | 'medium' | 'high';
  motivation_level: MotivationLevel;
  availability_preset: AvailabilityPreset;
  is_locked: boolean;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface DailyEnergy {
  id: string;
  user_id?: string;
  date: string;
  energy_level: DailyEnergyLevel;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarEvent {
  id: string;
  user_id?: string;
  title: string;
  start_time: string;
  end_time: string;
  is_external: boolean;
  external_id?: string | null;
  calendar_source?: string | null;
  location?: string | null;
  energy_level?: 'restful' | 'low' | 'medium' | 'high';
  energy_drain?: number | null; // Override drain in minutes (null = use duration)
  is_dismissed?: boolean; // Synced events can be dismissed (ghosted) without deleting
  created_at?: string;
  updated_at?: string;
}

export interface UserSettings {
  work_start_time: string;
  work_end_time: string;
  daily_capacity_minutes: number;
  timezone: string;
  availability_presets: {
    morning: { start: string; end: string };
    afternoon: { start: string; end: string };
    evening: { start: string; end: string };
  };
  day_intention: DayIntention;
}

export interface TimeBlock {
  hour: number;
  tasks: Task[];
  events: CalendarEvent[];
}

export interface DayCapacity {
  total: number;
  scheduled: number;
  available: number;
  percentage: number;
}
