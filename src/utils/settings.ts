import type { UserSettings } from '@/types/task';

const SETTINGS_KEY = 'scheduler_settings';

const DEFAULT_SETTINGS: UserSettings = {
  work_start_time: '06:00',
  work_end_time: '19:00',
  daily_capacity_minutes: 480,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  availability_presets: {
    morning: { start: '06:00', end: '12:00' },
    afternoon: { start: '12:00', end: '16:00' },
    evening: { start: '16:00', end: '19:00' },
  },
};

export const getSettings = (): UserSettings => {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) return DEFAULT_SETTINGS;
  
  const parsed = JSON.parse(stored);
  // Merge with defaults to handle new fields
  return { ...DEFAULT_SETTINGS, ...parsed };
};

export const saveSettings = (settings: UserSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
