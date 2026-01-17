import type { CalendarEvent, DailyEnergyLevel, DayCapacity, Task } from '@/types/task';
import { getDailyEnergyMultiplier, getEventDrainMinutes } from '@/utils/energy';

const DEFAULT_DAILY_ENERGY: DailyEnergyLevel = 'medium';
const WAKING_HOURS_MINUTES = 16 * 60;
const ESSENTIAL_MINUTES = 3 * 60;

export const calculateCapacity = (
  tasks: Task[],
  events: CalendarEvent[],
  dailyEnergyLevel?: DailyEnergyLevel
): DayCapacity => {
  const multiplier = getDailyEnergyMultiplier(dailyEnergyLevel || DEFAULT_DAILY_ENERGY);
  const baseProductiveMinutes = WAKING_HOURS_MINUTES - ESSENTIAL_MINUTES;
  const totalMinutes = Math.round(baseProductiveMinutes * multiplier);

  const scheduledMinutes = tasks
    .filter(task => task.scheduled_time && !task.completed)
    .reduce((acc, task) => acc + task.duration, 0);

  const eventMinutes = events.reduce((acc, event) => acc + getEventDrainMinutes(event), 0);
  const usedMinutes = scheduledMinutes + eventMinutes;
  const available = Math.max(0, totalMinutes - usedMinutes);

  return {
    total: totalMinutes,
    scheduled: usedMinutes,
    available,
    percentage: totalMinutes === 0 ? 0 : Math.round((usedMinutes / totalMinutes) * 100),
  };
};
