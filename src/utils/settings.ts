import type { UserSettings } from '@/types/task';

const SETTINGS_KEY = 'scheduler_settings';

export const getSettings = (): UserSettings => {
  const stored = localStorage.getItem(SETTINGS_KEY);
  return stored ? JSON.parse(stored) : {
    work_start_time: '09:00',
    work_end_time: '17:00',
    daily_capacity_minutes: 480,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
};

export const saveSettings = (settings: UserSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
