import type { CalendarEvent, DailyEnergyLevel, Task } from '@/types/task';
import { getTaskEnergyAlignmentBonus } from './energy';
import { getSettings } from './settings';
import { format } from 'date-fns';

interface ScheduleSlot {
  time: string; // HH:MM format
  available: boolean;
  duration: number; // minutes available
}

type ScoredTask = {
  task: Task;
  score: number;
};

export const autoScheduleTasks = (
  tasks: Task[],
  events: CalendarEvent[],
  workStart: string,
  workEnd: string,
  dailyEnergy: DailyEnergyLevel,
  targetDate: string
): Task[] => {
  const scoredTasks = scoreTasks(tasks, dailyEnergy);
  const slots = buildTimeSlots(workStart, workEnd, events, targetDate);
  return assignTasksToSlots(scoredTasks, slots, targetDate);
};

export const scoreTasks = (tasks: Task[], dailyEnergy: DailyEnergyLevel): ScoredTask[] => {
  return tasks
    .filter(task => !task.scheduled_time && !task.completed)
    .map(task => ({
      task,
      score: calculateTaskScore(task, dailyEnergy),
    }))
    .sort((a, b) => b.score - a.score);
};

export const buildTimeSlots = (
  workStart: string,
  workEnd: string,
  events: CalendarEvent[],
  targetDate: string
): ScheduleSlot[] => {
  const slots: ScheduleSlot[] = [];
  const [startHour] = workStart.split(':').map(Number);
  const [endHour] = workEnd.split(':').map(Number);

  // Check if we're scheduling for today
  const today = format(new Date(), 'yyyy-MM-dd');
  const isToday = targetDate === today;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const slotMinutes = h * 60 + m;
      // Mark past slots as unavailable when scheduling for today
      const isPast = isToday && slotMinutes < currentMinutes;
      slots.push({ time, available: !isPast, duration: 15 });
    }
  }

  events.forEach(event => {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    slots.forEach(slot => {
      const [h, m] = slot.time.split(':').map(Number);
      const slotDate = new Date(targetDate);
      slotDate.setHours(h, m, 0);

      if (slotDate >= eventStart && slotDate < eventEnd) {
        slot.available = false;
      }
    });
  });

  return slots;
};

export const assignTasksToSlots = (
  scoredTasks: ScoredTask[],
  slots: ScheduleSlot[],
  targetDate: string
): Task[] => {
  const scheduled: Task[] = [];

  for (const { task } of scoredTasks) {
    const slot = findBestSlot(task, slots);
    if (!slot) continue;

    scheduled.push({
      ...task,
      scheduled_time: slot.time,
      scheduled_date: targetDate,
    });
    markSlotsUsed(slots, slot.time, task.duration);
  }

  return scheduled;
};

const calculateTaskScore = (task: Task, dailyEnergy: DailyEnergyLevel): number => {
  const priorityWeight = { high: 3, medium: 2, low: 1 }[task.priority];
  const motivationWeight = { love: 5, like: 4, neutral: 3, dislike: 2, hate: 1 }[
    task.motivation_level
  ];
  const energyBonus = getTaskEnergyAlignmentBonus(task, dailyEnergy);

  return priorityWeight * 10 + motivationWeight * 2 + energyBonus;
};

const findBestSlot = (task: Task, slots: ScheduleSlot[]): ScheduleSlot | null => {
  const requiredSlots = Math.ceil(task.duration / 15);
  const settings = getSettings();
  const preset = task.availability_preset || 'any';

  // Get time window for the preset
  let windowStart = '00:00';
  let windowEnd = '23:59';
  if (preset !== 'any') {
    const presetConfig = settings.availability_presets[preset];
    windowStart = presetConfig.start;
    windowEnd = presetConfig.end;
  }

  const isSlotInWindow = (slotTime: string): boolean => {
    return slotTime >= windowStart && slotTime < windowEnd;
  };

  for (let i = 0; i <= slots.length - requiredSlots; i++) {
    const block = slots.slice(i, i + requiredSlots);
    // Check all slots in block are available AND within the task's preset window
    if (block.every(slot => slot.available && isSlotInWindow(slot.time))) {
      return slots[i];
    }
  }

  return null;
};

const markSlotsUsed = (slots: ScheduleSlot[], startTime: string, duration: number): void => {
  const requiredSlots = Math.ceil(duration / 15);
  const startIndex = slots.findIndex(slot => slot.time === startTime);

  for (let i = startIndex; i < startIndex + requiredSlots && i < slots.length; i++) {
    slots[i].available = false;
  }
};
