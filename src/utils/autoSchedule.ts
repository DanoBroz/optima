import type { Task, CalendarEvent, DailyEnergyLevel } from '@/types/task';

interface ScheduleSlot {
  time: string; // HH:MM format
  available: boolean;
  duration: number; // minutes available
}

export const autoScheduleTasks = (
  tasks: Task[],
  events: CalendarEvent[],
  workStart: string,
  workEnd: string,
  dailyEnergy: DailyEnergyLevel,
  targetDate: string
): Task[] => {
  // 1. Filter unscheduled, incomplete tasks
  const unscheduled = tasks.filter(t => !t.scheduled_time && !t.completed);

  // 2. Score and sort tasks by priority
  const scored = unscheduled.map(task => ({
    task,
    score: calculateTaskScore(task, dailyEnergy)
  })).sort((a, b) => b.score - a.score);

  // 3. Build available time slots (15-min intervals)
  const slots = buildTimeSlots(workStart, workEnd, events, targetDate);

  // 4. Assign tasks to slots (greedy algorithm)
  const scheduled = [];
  for (const { task } of scored) {
    const slot = findBestSlot(task, slots);
    if (slot) {
      scheduled.push({
        ...task,
        scheduled_time: slot.time,
        scheduled_date: targetDate
      });
      markSlotsUsed(slots, slot.time, task.duration);
    }
  }

  return scheduled;
};

function calculateTaskScore(task: Task, dailyEnergy: DailyEnergyLevel): number {
  // Priority weight: high=3, medium=2, low=1
  const priorityWeight = { high: 3, medium: 2, low: 1 }[task.priority];

  // Motivation weight: love=5, like=4, neutral=3, dislike=2, hate=1
  const motivationWeight = { love: 5, like: 4, neutral: 3, dislike: 2, hate: 1 }[task.motivation_level];

  // Energy alignment: match task energy_level to dailyEnergy
  const energyBonus = matchEnergyLevel(task.energy_level, dailyEnergy) ? 2 : 0;

  return (priorityWeight * 10) + (motivationWeight * 2) + energyBonus;
}

function matchEnergyLevel(taskEnergy: string, dailyEnergy: DailyEnergyLevel): boolean {
  // High energy tasks for high energy days
  if (taskEnergy === 'high' && ['high', 'energized'].includes(dailyEnergy)) return true;
  // Low energy tasks for low energy days
  if (taskEnergy === 'low' && ['low', 'exhausted'].includes(dailyEnergy)) return true;
  // Medium energy always okay
  if (taskEnergy === 'medium') return true;
  return false;
}

function buildTimeSlots(
  workStart: string,
  workEnd: string,
  events: CalendarEvent[],
  targetDate: string
): ScheduleSlot[] {
  const slots: ScheduleSlot[] = [];
  const [startHour] = workStart.split(':').map(Number);
  const [endHour] = workEnd.split(':').map(Number);

  // Create 15-minute slots
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      slots.push({ time, available: true, duration: 15 });
    }
  }

  // Mark event slots as unavailable
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
}

function findBestSlot(task: Task, slots: ScheduleSlot[]): ScheduleSlot | null {
  // Find first contiguous block of available slots that fit task duration
  const requiredSlots = Math.ceil(task.duration / 15);

  for (let i = 0; i <= slots.length - requiredSlots; i++) {
    const block = slots.slice(i, i + requiredSlots);
    if (block.every(s => s.available)) {
      return slots[i];
    }
  }

  return null;
}

function markSlotsUsed(slots: ScheduleSlot[], startTime: string, duration: number): void {
  const requiredSlots = Math.ceil(duration / 15);
  const startIndex = slots.findIndex(s => s.time === startTime);

  for (let i = startIndex; i < startIndex + requiredSlots && i < slots.length; i++) {
    slots[i].available = false;
  }
}
