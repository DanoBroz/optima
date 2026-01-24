/**
 * Tests for taskRepository transformation and parsing logic.
 *
 * Note: These tests focus on the pure parsing functions.
 * Database operations would require integration tests with Supabase.
 */

import { describe, expect, it } from 'vitest';
import type { AvailabilityWindows, TimeWindow } from '@/types/task';

// ─────────────────────────────────────────────────────────────────────────────
// Extract parseAvailabilityWindows for testing
// This mirrors the implementation in taskRepository.ts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses availability_windows from database storage format.
 *
 * Handles multiple legacy formats:
 * - 'any' or '' → empty array (no restrictions)
 * - 'morning' → ['morning']
 * - '["morning","afternoon"]' → ['morning', 'afternoon']
 * - ['morning', 'afternoon'] → ['morning', 'afternoon']
 */
const parseAvailabilityWindows = (value: unknown): AvailabilityWindows => {
  if (!value) return [];

  // Handle legacy single string values: 'any', 'morning', 'afternoon', 'evening'
  if (typeof value === 'string') {
    if (value === 'any' || value === '') return [];
    if (['morning', 'afternoon', 'evening'].includes(value)) {
      return [value as TimeWindow];
    }
    // Try parsing as JSON array
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as AvailabilityWindows;
    } catch {
      return [];
    }
  }

  // Handle array from DB (some DBs return arrays directly)
  if (Array.isArray(value)) return value as AvailabilityWindows;

  return [];
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('parseAvailabilityWindows', () => {
  describe('null/undefined/empty handling', () => {
    it('returns empty array for null', () => {
      expect(parseAvailabilityWindows(null)).toEqual([]);
    });

    it('returns empty array for undefined', () => {
      expect(parseAvailabilityWindows(undefined)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(parseAvailabilityWindows('')).toEqual([]);
    });

    it('returns empty array for false', () => {
      expect(parseAvailabilityWindows(false)).toEqual([]);
    });

    it('returns empty array for zero', () => {
      expect(parseAvailabilityWindows(0)).toEqual([]);
    });
  });

  describe('legacy "any" format', () => {
    it('converts "any" to empty array (meaning no restrictions)', () => {
      expect(parseAvailabilityWindows('any')).toEqual([]);
    });
  });

  describe('legacy single window strings', () => {
    it('converts "morning" to array with single element', () => {
      expect(parseAvailabilityWindows('morning')).toEqual(['morning']);
    });

    it('converts "afternoon" to array with single element', () => {
      expect(parseAvailabilityWindows('afternoon')).toEqual(['afternoon']);
    });

    it('converts "evening" to array with single element', () => {
      expect(parseAvailabilityWindows('evening')).toEqual(['evening']);
    });
  });

  describe('JSON string arrays', () => {
    it('parses JSON array of single window', () => {
      expect(parseAvailabilityWindows('["morning"]')).toEqual(['morning']);
    });

    it('parses JSON array of multiple windows', () => {
      expect(parseAvailabilityWindows('["morning","afternoon"]')).toEqual([
        'morning',
        'afternoon',
      ]);
    });

    it('parses JSON array of all windows', () => {
      expect(parseAvailabilityWindows('["morning","afternoon","evening"]')).toEqual([
        'morning',
        'afternoon',
        'evening',
      ]);
    });

    it('returns empty array for invalid JSON', () => {
      expect(parseAvailabilityWindows('not valid json')).toEqual([]);
    });

    it('returns empty array for JSON that is not an array', () => {
      expect(parseAvailabilityWindows('{"morning": true}')).toEqual([]);
    });
  });

  describe('native arrays (from Postgres ARRAY type)', () => {
    it('returns array directly when input is already an array', () => {
      expect(parseAvailabilityWindows(['morning'])).toEqual(['morning']);
    });

    it('handles multiple windows in native array', () => {
      expect(parseAvailabilityWindows(['morning', 'evening'])).toEqual([
        'morning',
        'evening',
      ]);
    });

    it('handles empty native array', () => {
      expect(parseAvailabilityWindows([])).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('handles unknown string values gracefully', () => {
      expect(parseAvailabilityWindows('night')).toEqual([]);
      expect(parseAvailabilityWindows('anytime')).toEqual([]);
    });

    it('handles number input gracefully', () => {
      expect(parseAvailabilityWindows(123)).toEqual([]);
    });

    it('handles object input gracefully', () => {
      expect(parseAvailabilityWindows({ morning: true })).toEqual([]);
    });

    it('preserves order of windows', () => {
      expect(parseAvailabilityWindows(['evening', 'morning', 'afternoon'])).toEqual([
        'evening',
        'morning',
        'afternoon',
      ]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// toTask transformation tests
// ─────────────────────────────────────────────────────────────────────────────

describe('toTask transformation', () => {
  // Simulate DB row structure
  interface TaskRow {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    completed: boolean;
    scheduled_time: string | null;
    scheduled_date: string | null;
    duration: number;
    priority: 'low' | 'medium' | 'high';
    energy_level: 'low' | 'medium' | 'high';
    motivation_level: 'hate' | 'dislike' | 'neutral' | 'like' | 'love';
    availability_windows?: unknown;
    is_locked: boolean;
    order_index: number;
    created_at: string;
    updated_at: string;
  }

  const toTask = (row: TaskRow) => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    completed: row.completed,
    scheduled_time: row.scheduled_time,
    scheduled_date: row.scheduled_date,
    duration: row.duration,
    priority: row.priority,
    energy_level: row.energy_level,
    motivation_level: row.motivation_level,
    availability_windows: parseAvailabilityWindows(row.availability_windows),
    is_locked: row.is_locked,
    order_index: row.order_index,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

  const baseRow: TaskRow = {
    id: 'task-1',
    user_id: 'user-1',
    title: 'Test Task',
    description: null,
    completed: false,
    scheduled_time: '09:00',
    scheduled_date: '2024-01-15',
    duration: 30,
    priority: 'medium',
    energy_level: 'medium',
    motivation_level: 'neutral',
    availability_windows: [],
    is_locked: false,
    order_index: 0,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  };

  it('transforms a complete row to Task', () => {
    const task = toTask(baseRow);

    expect(task.id).toBe('task-1');
    expect(task.title).toBe('Test Task');
    expect(task.completed).toBe(false);
    expect(task.scheduled_time).toBe('09:00');
    expect(task.scheduled_date).toBe('2024-01-15');
    expect(task.duration).toBe(30);
    expect(task.priority).toBe('medium');
    expect(task.energy_level).toBe('medium');
    expect(task.availability_windows).toEqual([]);
  });

  it('handles legacy string availability_windows', () => {
    const row = { ...baseRow, availability_windows: 'morning' };
    const task = toTask(row);

    expect(task.availability_windows).toEqual(['morning']);
  });

  it('handles JSON string availability_windows', () => {
    const row = { ...baseRow, availability_windows: '["morning","evening"]' };
    const task = toTask(row);

    expect(task.availability_windows).toEqual(['morning', 'evening']);
  });

  it('handles null availability_windows', () => {
    const row = { ...baseRow, availability_windows: null };
    const task = toTask(row);

    expect(task.availability_windows).toEqual([]);
  });

  it('preserves null description', () => {
    const row = { ...baseRow, description: null };
    const task = toTask(row);

    expect(task.description).toBeNull();
  });

  it('preserves description when present', () => {
    const row = { ...baseRow, description: 'Task description' };
    const task = toTask(row);

    expect(task.description).toBe('Task description');
  });

  it('handles null scheduled_time for backlog tasks', () => {
    const row = { ...baseRow, scheduled_time: null, scheduled_date: null };
    const task = toTask(row);

    expect(task.scheduled_time).toBeNull();
    expect(task.scheduled_date).toBeNull();
  });
});
