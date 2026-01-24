import type { CalendarEvent, DailyEnergyLevel, DayIntention, Task } from '@/types/task';
import { getDurationMinutes } from './time';
import {
  EVENT_ENERGY_CONFIG,
  DAILY_ENERGY_CONFIG,
  INTENTION_MULTIPLIERS,
  type EventEnergyLevel,
} from '@/config/energy';

// Re-export for backward compatibility
export type { EventEnergyLevel };

export const getDailyEnergyMultiplier = (energy: DailyEnergyLevel): number => {
  return DAILY_ENERGY_CONFIG[energy].multiplier;
};

export const getIntentionMultiplier = (intention: DayIntention): number => {
  return INTENTION_MULTIPLIERS[intention];
};

export const getEventEnergyLevel = (event: CalendarEvent): EventEnergyLevel => {
  return (event.energy_level || 'medium') as EventEnergyLevel;
};

export const getEventDrainMinutes = (event: CalendarEvent): number => {
  if (event.energy_drain !== undefined && event.energy_drain !== null) {
    return event.energy_drain;
  }

  const durationMinutes = getDurationMinutes(event.start_time, event.end_time);
  const energyLevel = getEventEnergyLevel(event);
  return Math.round(durationMinutes * EVENT_ENERGY_CONFIG[energyLevel].drainMultiplier);
};

export const getTaskEnergyAlignmentBonus = (
  task: Task,
  dailyEnergy: DailyEnergyLevel
): number => {
  if (task.energy_level === 'high' && ['high', 'energized'].includes(dailyEnergy)) return 2;
  if (task.energy_level === 'low' && ['low', 'exhausted'].includes(dailyEnergy)) return 2;
  if (task.energy_level === 'medium') return 2;
  return 0;
};
