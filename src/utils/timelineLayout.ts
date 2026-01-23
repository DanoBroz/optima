import type { Task, CalendarEvent } from '@/types/task';

// Layout configuration constants
// Hour grid is compact and fixed; cards scale proportionally within it
export const HOUR_ROW_HEIGHT = 120; // Fixed height per hour row
export const PIXELS_PER_MINUTE = HOUR_ROW_HEIGHT / 60; // 2px per minute
export const MIN_CARD_HEIGHT = 52; // Minimum card height for readability
export const DEFAULT_TASK_DURATION = 30; // Default duration if not specified
export const LANE_GAP = 12; // Gap between event and task lanes in pixels
export const CARD_VERTICAL_GAP = 4; // Vertical gap between overlapping cards

export interface TimelineItem {
  id: string;
  startMinutes: number; // Minutes from midnight
  endMinutes: number;
  type: 'task' | 'event';
}

export interface LayoutItem extends TimelineItem {
  column: number; // 0-indexed column assignment within the lane
  totalColumns: number; // Total columns in this overlap group
  top: number; // Pixel position from top
  height: number; // Pixel height
}

export interface TimelineLayoutResult {
  tasks: LayoutItem[];
  events: LayoutItem[];
  totalHeight: number;
}

/**
 * Convert HH:MM time string to minutes from midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Convert minutes from midnight back to HH:MM format
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Convert CalendarEvent to TimelineItem
 */
export function eventToTimelineItem(event: CalendarEvent): TimelineItem {
  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);

  const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
  const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

  return {
    id: event.id,
    startMinutes,
    endMinutes: endMinutes > startMinutes ? endMinutes : startMinutes + 30, // Handle same-time edge case
    type: 'event',
  };
}

/**
 * Convert Task to TimelineItem (returns null if not scheduled)
 */
export function taskToTimelineItem(task: Task): TimelineItem | null {
  if (!task.scheduled_time) return null;

  const startMinutes = timeToMinutes(task.scheduled_time);
  const duration = task.duration || DEFAULT_TASK_DURATION;
  const endMinutes = startMinutes + duration;

  return {
    id: task.id,
    startMinutes,
    endMinutes,
    type: 'task',
  };
}

/**
 * Calculate pixel position from minutes
 */
export function minutesToPixels(minutes: number): number {
  return minutes * PIXELS_PER_MINUTE;
}

/**
 * Calculate card height with minimum constraint
 */
export function calculateCardHeight(durationMinutes: number): number {
  return Math.max(MIN_CARD_HEIGHT, durationMinutes * PIXELS_PER_MINUTE);
}

/**
 * Check if two time ranges overlap
 */
function rangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Calculate overlap columns for a list of timeline items.
 * Uses a greedy algorithm to assign items to columns.
 */
export function calculateOverlapColumns(items: TimelineItem[]): LayoutItem[] {
  if (items.length === 0) return [];

  // Sort by start time, then by end time (shorter items first for better packing)
  const sorted = [...items].sort((a, b) =>
    a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes
  );

  // Track column end times to assign columns greedily
  const columnEndTimes: number[] = [];
  const assignments: { item: TimelineItem; column: number }[] = [];

  for (const item of sorted) {
    // Find first column that's free (ends before or at this item's start)
    let assignedColumn = columnEndTimes.findIndex(
      endTime => endTime <= item.startMinutes
    );

    if (assignedColumn === -1) {
      // No free column, create new one
      assignedColumn = columnEndTimes.length;
      columnEndTimes.push(item.endMinutes);
    } else {
      columnEndTimes[assignedColumn] = item.endMinutes;
    }

    assignments.push({ item, column: assignedColumn });
  }

  // Now calculate totalColumns for each item based on overlapping items
  const result: LayoutItem[] = assignments.map(({ item, column }) => {
    // Find all items that overlap with this one
    const overlapping = assignments.filter(({ item: other }) =>
      rangesOverlap(item.startMinutes, item.endMinutes, other.startMinutes, other.endMinutes)
    );

    // The total columns is the max column number + 1 among overlapping items
    const totalColumns = Math.max(...overlapping.map(o => o.column)) + 1;

    return {
      ...item,
      column,
      totalColumns,
      top: minutesToPixels(item.startMinutes),
      height: calculateCardHeight(item.endMinutes - item.startMinutes),
    };
  });

  return result;
}

/**
 * Main layout function - calculates positions for all tasks and events
 */
export function calculateTimelineLayout(
  tasks: Task[],
  events: CalendarEvent[]
): TimelineLayoutResult {
  // Convert to timeline items
  const taskItems = tasks
    .map(taskToTimelineItem)
    .filter((item): item is TimelineItem => item !== null);

  const eventItems = events.map(eventToTimelineItem);

  // Calculate columns separately for tasks and events (they have separate lanes)
  const layoutTasks = calculateOverlapColumns(taskItems);
  const layoutEvents = calculateOverlapColumns(eventItems);

  // Total height is 24 hours
  const totalHeight = 24 * 60 * PIXELS_PER_MINUTE;

  return {
    tasks: layoutTasks,
    events: layoutEvents,
    totalHeight,
  };
}

/**
 * Snap minutes to nearest interval (e.g., 15-minute intervals)
 */
export function snapToInterval(minutes: number, interval: number = 15): number {
  return Math.round(minutes / interval) * interval;
}

/**
 * Convert Y position (pixels) to time, with optional snapping
 */
export function pixelsToTime(
  pixels: number,
  snap: boolean = true,
  snapInterval: number = 15
): string {
  let minutes = Math.round(pixels / PIXELS_PER_MINUTE);
  if (snap) {
    minutes = snapToInterval(minutes, snapInterval);
  }
  // Clamp to valid range
  minutes = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  return minutesToTime(minutes);
}
