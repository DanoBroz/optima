/**
 * Unified energy, priority, and motivation configurations.
 * Single source of truth - import from here instead of defining inline.
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

export const DAILY_ENERGY_CONFIG: Record<DailyEnergyLevel, DailyEnergyConfig> = {
  exhausted: { emoji: '🌙', label: 'Rest', multiplier: 0.3 },
  low: { emoji: '🌿', label: 'Low', multiplier: 0.5 },
  medium: { emoji: '☀️', label: 'Good', multiplier: 0.7 },
  high: { emoji: '⚡', label: 'High', multiplier: 0.85 },
  energized: { emoji: '🔥', label: 'Peak', multiplier: 1.0 },
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

export const INTENTION_MULTIPLIERS: Record<DayIntention, number> = {
  push: 1.2,
  balance: 1.0,
  recovery: 0.6,
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
