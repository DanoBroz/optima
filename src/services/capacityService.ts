import type { CalendarEvent, DailyEnergyLevel, DayCapacity, DayIntention, Task } from '@/types/task';
import { getDailyEnergyMultiplier, getEventDrainMinutes, getIntentionMultiplier } from '@/utils/energy';

const DEFAULT_DAILY_ENERGY: DailyEnergyLevel = 'medium';
const DEFAULT_INTENTION: DayIntention = 'balance';
const WAKING_HOURS_MINUTES = 16 * 60;
const ESSENTIAL_MINUTES = 3 * 60;

export const calculateCapacity = (
  tasks: Task[],
  events: CalendarEvent[],
  dailyEnergyLevel?: DailyEnergyLevel,
  dayIntention?: DayIntention
): DayCapacity => {
  const energyMultiplier = getDailyEnergyMultiplier(dailyEnergyLevel || DEFAULT_DAILY_ENERGY);
  const intentionMultiplier = getIntentionMultiplier(dayIntention || DEFAULT_INTENTION);
  const baseProductiveMinutes = WAKING_HOURS_MINUTES - ESSENTIAL_MINUTES;
  const totalMinutes = Math.round(baseProductiveMinutes * energyMultiplier * intentionMultiplier);

  const scheduledMinutes = tasks
    .filter(task => task.scheduled_time)
    .reduce((acc, task) => acc + task.duration, 0);

  // Exclude dismissed events from capacity drain calculation
  const activeEvents = events.filter(event => !event.is_dismissed);
  const eventMinutes = activeEvents.reduce((acc, event) => acc + getEventDrainMinutes(event), 0);
  const usedMinutes = scheduledMinutes + eventMinutes;
  const available = Math.max(0, totalMinutes - usedMinutes);

  return {
    total: totalMinutes,
    scheduled: usedMinutes,
    available,
    percentage: totalMinutes === 0 ? 0 : Math.round((usedMinutes / totalMinutes) * 100),
  };
};
