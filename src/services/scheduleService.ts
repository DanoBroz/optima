import type { CalendarEvent, DailyEnergyLevel, Task } from '@/types/task';
import { autoScheduleTasks } from '@/utils/autoSchedule';
import { getSettings } from '@/utils/settings';

export const scheduleService = {
  autoSchedule(
    tasks: Task[],
    events: CalendarEvent[],
    dailyEnergy: DailyEnergyLevel,
    targetDate: string
  ): Task[] {
    const settings = getSettings();
    return autoScheduleTasks(
      tasks,
      events,
      settings.work_start_time,
      settings.work_end_time,
      dailyEnergy,
      targetDate
    );
  },
};
