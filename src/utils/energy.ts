import type { CalendarEvent, DailyEnergyLevel, Task } from '@/types/task';
import { getDurationMinutes } from './time';


const ENERGY_DRAIN_MULTIPLIERS: Record<EventEnergyLevel, number> = {
  low: 0.5,
  medium: 1.0,
  high: 1.5,
};

const DAILY_ENERGY_MULTIPLIERS: Record<DailyEnergyLevel, number> = {
  exhausted: 0.3,
  low: 0.5,
  medium: 0.7,
  high: 0.85,
  energized: 1.0,
};

export type EventEnergyLevel = 'low' | 'medium' | 'high';

export const getDailyEnergyMultiplier = (energy: DailyEnergyLevel): number => {
  return DAILY_ENERGY_MULTIPLIERS[energy];
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
  return Math.round(durationMinutes * ENERGY_DRAIN_MULTIPLIERS[energyLevel]);
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
