/**
 * Energy System Configuration
 * ===========================
 *
 * This module defines the energy multipliers and configurations that drive
 * Optima's capacity calculations and scheduling decisions.
 *
 * ## Design Philosophy
 *
 * The energy system is based on the principle that **productive capacity varies
 * throughout the day and across days** depending on energy levels. Rather than
 * treating all hours as equal, we adjust available capacity based on how the
 * user feels.
 *
 * ## Multiplier Rationale
 *
 * ### Daily Energy Multipliers
 *
 * These represent what percentage of your theoretical maximum you can achieve:
 *
 * | Level     | Multiplier | Rationale |
 * |-----------|------------|-----------|
 * | exhausted | 0.3 (30%)  | Severe fatigue. Only essential tasks. Rest is priority. |
 * | low       | 0.5 (50%)  | Below baseline. Focus on low-energy tasks. |
 * | medium    | 0.7 (70%)  | Normal productive day. Good balance. |
 * | high      | 0.85 (85%)| Above average. Can tackle demanding tasks. |
 * | energized | 1.0 (100%) | Peak performance. Maximum capacity. |
 *
 * Note: Even "energized" doesn't exceed 100% because overcommitting leads to
 * burnout. The multipliers are intentionally conservative.
 *
 * ### Day Intention Multipliers
 *
 * These let users consciously choose their day's intensity:
 *
 * | Intention | Multiplier | Use Case |
 * |-----------|------------|----------|
 * | push      | 1.2 (120%) | Deadline day. Willing to stretch limits temporarily. |
 * | balance   | 1.0 (100%) | Sustainable pace. Default for most days. |
 * | recovery  | 0.6 (60%)  | Post-crunch recovery. Prioritize wellbeing. |
 *
 * ### Event Energy Drain
 *
 * Events consume capacity based on their intensity:
 *
 * | Level   | Multiplier | Example |
 * |---------|------------|---------|
 * | restful | 0.0        | Lunch break, meditation, walk |
 * | low     | 0.5        | Casual 1:1, reading time |
 * | medium  | 1.0        | Regular meeting, focused work |
 * | high    | 1.5        | Presentations, interviews, difficult conversations |
 *
 * A 1-hour "high" energy meeting drains 90 minutes of capacity because it
 * requires preparation and recovery time beyond the meeting itself.
 *
 * ## How Multipliers Combine
 *
 * ```
 * availableCapacity = baseMinutes × dailyEnergyMultiplier × intentionMultiplier
 * ```
 *
 * Example: Exhausted (0.3) + Recovery (0.6) = 0.18 = only 18% capacity
 * Example: Energized (1.0) + Push (1.2) = 1.2 = 120% capacity (stretch day)
 *
 * @module config/energy
 */

import type { DailyEnergyLevel, DayIntention, MotivationLevel } from '@/types/task';

// =============================================================================
// EVENT ENERGY (4 levels: restful, low, medium, high)
// =============================================================================

export type EventEnergyLevel = 'restful' | 'low' | 'medium' | 'high';

export interface EventEnergyConfig {
  emoji: string;
  label: string;
  description: string;
  drainMultiplier: number;
  bg: string;
  border: string;
  accent: string;
  title: string;
  indicator: string;
}

export const EVENT_ENERGY_CONFIG: Record<EventEnergyLevel, EventEnergyConfig> = {
  restful: {
    emoji: '🌿',
    label: 'Restful',
    description: 'Recharging, restorative',
    drainMultiplier: 0,
    bg: 'bg-sky-100 dark:bg-sky-900/40',
    border: 'border-sky-200 dark:border-sky-700',
    accent: 'text-sky-700 dark:text-sky-300',
    title: 'text-sky-900 dark:text-sky-100',
    indicator: 'bg-sky-500',
  },
  low: {
    emoji: '🧘',
    label: 'Light',
    description: 'Relaxing, recovery',
    drainMultiplier: 0.5,
    bg: 'bg-success/10',
    border: 'border-success/20',
    accent: 'text-success',
    title: 'text-foreground',
    indicator: 'bg-success',
  },
  medium: {
    emoji: '💼',
    label: 'Normal',
    description: 'Regular activity',
    drainMultiplier: 1.0,
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    accent: 'text-primary',
    title: 'text-foreground',
    indicator: 'bg-primary',
  },
  high: {
    emoji: '🔥',
    label: 'Draining',
    description: 'Intense, exhausting',
    drainMultiplier: 1.5,
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
    accent: 'text-destructive',
    title: 'text-foreground',
    indicator: 'bg-destructive',
  },
} as const;

/** Array form for rendering selection lists */
export const EVENT_ENERGY_OPTIONS = Object.entries(EVENT_ENERGY_CONFIG).map(
  ([level, config]) => ({
    level: level as EventEnergyLevel,
    ...config,
  })
);

// =============================================================================
// DAILY ENERGY (5 levels: exhausted, low, medium, high, energized)
// =============================================================================

export interface DailyEnergyConfig {
  emoji: string;
  label: string;
  multiplier: number;
}

/**
 * Daily energy levels with capacity multipliers.
 * See module docs for rationale behind each multiplier value.
 */
export const DAILY_ENERGY_CONFIG: Record<DailyEnergyLevel, DailyEnergyConfig> = {
  exhausted: { emoji: '🌙', label: 'Rest', multiplier: 0.3 },   // Severe fatigue
  low: { emoji: '🌿', label: 'Low', multiplier: 0.5 },          // Below baseline
  medium: { emoji: '☀️', label: 'Good', multiplier: 0.7 },      // Normal day
  high: { emoji: '⚡', label: 'High', multiplier: 0.85 },        // Above average
  energized: { emoji: '🔥', label: 'Peak', multiplier: 1.0 },   // Maximum output
} as const;

/** Array form for rendering selection lists */
export const DAILY_ENERGY_OPTIONS = Object.entries(DAILY_ENERGY_CONFIG).map(
  ([level, config]) => ({
    level: level as DailyEnergyLevel,
    ...config,
  })
);

// =============================================================================
// DAY INTENTION (push, balance, recovery)
// =============================================================================

/**
 * Day intention multipliers for capacity adjustment.
 *
 * - push (1.2): User consciously choosing to exceed sustainable pace
 * - balance (1.0): Default sustainable productivity
 * - recovery (0.6): Deliberately reduced load for wellbeing
 */
export const INTENTION_MULTIPLIERS: Record<DayIntention, number> = {
  push: 1.2,      // Stretch day: deadlines, sprints
  balance: 1.0,   // Sustainable pace (default)
  recovery: 0.6,  // Rest day: post-crunch, sick recovery
} as const;

// =============================================================================
// TASK ENERGY (3 levels: low, medium, high - note: no 'restful')
// =============================================================================

export type TaskEnergyLevel = 'low' | 'medium' | 'high';

export interface TaskEnergyBadgeConfig {
  bg: string;
  text: string;
}

export const TASK_ENERGY_BADGES: Record<TaskEnergyLevel, TaskEnergyBadgeConfig> = {
  low: { bg: 'bg-secondary', text: 'text-muted-foreground' },
  medium: { bg: 'bg-accent', text: 'text-accent-foreground' },
  high: { bg: 'bg-primary/15', text: 'text-primary' },
} as const;

// =============================================================================
// TASK PRIORITY
// =============================================================================

export type TaskPriority = 'low' | 'medium' | 'high';

export interface PriorityConfig {
  marks: string;
  color: string;
}

export const PRIORITY_CONFIG: Record<TaskPriority, PriorityConfig> = {
  low: { marks: '!', color: 'text-muted-foreground' },
  medium: { marks: '!!', color: 'text-amber-500 dark:text-amber-400' },
  high: { marks: '!!!', color: 'text-destructive' },
} as const;

// =============================================================================
// MOTIVATION
// =============================================================================

export const MOTIVATION_EMOJIS: Record<MotivationLevel, string> = {
  hate: '😫',
  dislike: '😕',
  neutral: '😐',
  like: '🙂',
  love: '😍',
} as const;
