import type { CalendarEvent, DailyEnergyLevel, Task } from '@/types/task';
import { getTaskEnergyAlignmentBonus } from './energy';

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

  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      slots.push({ time, available: true, duration: 15 });
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

  for (let i = 0; i <= slots.length - requiredSlots; i++) {
    const block = slots.slice(i, i + requiredSlots);
    if (block.every(slot => slot.available)) {
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
