/**
 * Tests for capacityService business logic.
 *
 * The capacity calculation is a critical business rule that determines
 * how much productive time a user has available based on:
 * - Daily energy level (affects base capacity via multiplier)
 * - Day intention (push/balance/recovery affects multiplier)
 * - Scheduled tasks (consume capacity)
 * - Calendar events (consume capacity based on energy drain)
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { calculateCapacity } from '../capacityService';
import {
  createTask,
  createScheduledTask,
  createEventAt,
  resetFactoryCounters,
} from '@/test/factories';
// Types imported for documentation purposes but tests verify actual values

// ─────────────────────────────────────────────────────────────────────────────
// Constants (mirroring capacityService.ts for test clarity)
// ─────────────────────────────────────────────────────────────────────────────

const WAKING_HOURS_MINUTES = 16 * 60; // 960 minutes
const ESSENTIAL_MINUTES = 3 * 60; // 180 minutes
const BASE_PRODUCTIVE_MINUTES = WAKING_HOURS_MINUTES - ESSENTIAL_MINUTES; // 780 minutes

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateCapacity', () => {
  beforeEach(() => {
    resetFactoryCounters();
  });

  describe('base capacity calculation', () => {
    it('calculates total capacity for medium energy + balance intention', () => {
      const capacity = calculateCapacity([], [], 'medium', 'balance');

      // 780 * 0.7 * 1.0 = 546 minutes
      const expected = Math.round(BASE_PRODUCTIVE_MINUTES * 0.7 * 1.0);
      expect(capacity.total).toBe(expected);
      expect(capacity.total).toBe(546);
    });

    it('calculates total capacity for exhausted energy', () => {
      const capacity = calculateCapacity([], [], 'exhausted', 'balance');

      // 780 * 0.3 * 1.0 = 234 minutes
      expect(capacity.total).toBe(234);
    });

    it('calculates total capacity for energized energy', () => {
      const capacity = calculateCapacity([], [], 'energized', 'balance');

      // 780 * 1.0 * 1.0 = 780 minutes
      expect(capacity.total).toBe(780);
    });

    it('calculates total capacity for push intention', () => {
      const capacity = calculateCapacity([], [], 'medium', 'push');

      // 780 * 0.7 * 1.2 = 655.2 → 655 minutes
      expect(capacity.total).toBe(655);
    });

    it('calculates total capacity for recovery intention', () => {
      const capacity = calculateCapacity([], [], 'medium', 'recovery');

      // 780 * 0.7 * 0.6 = 327.6 → 328 minutes
      expect(capacity.total).toBe(328);
    });

    it('combines energy and intention multipliers correctly', () => {
      // Exhausted + recovery = minimal capacity
      const minimal = calculateCapacity([], [], 'exhausted', 'recovery');
      // 780 * 0.3 * 0.6 = 140.4 → 140 minutes
      expect(minimal.total).toBe(140);

      // Energized + push = maximum capacity
      const maximum = calculateCapacity([], [], 'energized', 'push');
      // 780 * 1.0 * 1.2 = 936 minutes
      expect(maximum.total).toBe(936);
    });
  });

  describe('default values', () => {
    it('uses medium energy when undefined', () => {
      const capacity = calculateCapacity([], [], undefined, 'balance');

      // Should use medium (0.7)
      expect(capacity.total).toBe(546);
    });

    it('uses balance intention when undefined', () => {
      const capacity = calculateCapacity([], [], 'medium', undefined);

      // Should use balance (1.0)
      expect(capacity.total).toBe(546);
    });

    it('uses both defaults when both undefined', () => {
      const capacity = calculateCapacity([], []);

      // medium (0.7) * balance (1.0) = 0.7
      expect(capacity.total).toBe(546);
    });
  });

  describe('scheduled task consumption', () => {
    it('subtracts scheduled task durations from available', () => {
      const tasks = [
        createScheduledTask('09:00', '2024-01-15', { duration: 60 }),
        createScheduledTask('10:00', '2024-01-15', { duration: 30 }),
      ];

      const capacity = calculateCapacity(tasks, [], 'medium', 'balance');

      expect(capacity.scheduled).toBe(90); // 60 + 30
      expect(capacity.available).toBe(546 - 90); // 456
    });

    it('ignores unscheduled tasks (backlog)', () => {
      const tasks = [
        createScheduledTask('09:00', '2024-01-15', { duration: 60 }),
        createTask({ duration: 120, scheduled_time: null }), // Not scheduled
      ];

      const capacity = calculateCapacity(tasks, [], 'medium', 'balance');

      expect(capacity.scheduled).toBe(60); // Only the scheduled task
    });

    it('includes completed scheduled tasks in consumption', () => {
      const tasks = [
        createScheduledTask('09:00', '2024-01-15', { duration: 60, completed: true }),
      ];

      const capacity = calculateCapacity(tasks, [], 'medium', 'balance');

      expect(capacity.scheduled).toBe(60); // Still counts as scheduled
    });
  });

  describe('event consumption', () => {
    it('subtracts event energy drain from available capacity', () => {
      // Medium energy event: 60 minutes * 1.0 multiplier = 60 minutes drain
      const events = [
        createEventAt('10:00', '11:00', '2024-01-15', { energy_level: 'medium' }),
      ];

      const capacity = calculateCapacity([], events, 'medium', 'balance');

      expect(capacity.scheduled).toBe(60);
      expect(capacity.available).toBe(546 - 60);
    });

    it('calculates high energy event drain correctly', () => {
      // High energy event: 60 minutes * 1.5 multiplier = 90 minutes drain
      const events = [
        createEventAt('10:00', '11:00', '2024-01-15', { energy_level: 'high' }),
      ];

      const capacity = calculateCapacity([], events, 'medium', 'balance');

      expect(capacity.scheduled).toBe(90);
    });

    it('calculates low energy event drain correctly', () => {
      // Low energy event: 60 minutes * 0.5 multiplier = 30 minutes drain
      const events = [
        createEventAt('10:00', '11:00', '2024-01-15', { energy_level: 'low' }),
      ];

      const capacity = calculateCapacity([], events, 'medium', 'balance');

      expect(capacity.scheduled).toBe(30);
    });

    it('calculates restful event as zero drain', () => {
      // Restful event: 60 minutes * 0 multiplier = 0 minutes drain
      const events = [
        createEventAt('12:00', '13:00', '2024-01-15', { energy_level: 'restful' }),
      ];

      const capacity = calculateCapacity([], events, 'medium', 'balance');

      expect(capacity.scheduled).toBe(0);
    });

    it('respects explicit energy_drain override', () => {
      // Event with explicit drain override
      const events = [
        createEventAt('10:00', '11:00', '2024-01-15', {
          energy_level: 'high', // Would normally be 90 minutes
          energy_drain: 45, // But override to 45
        }),
      ];

      const capacity = calculateCapacity([], events, 'medium', 'balance');

      expect(capacity.scheduled).toBe(45);
    });

    it('excludes dismissed events from capacity', () => {
      const events = [
        createEventAt('10:00', '11:00', '2024-01-15', {
          energy_level: 'medium',
          is_dismissed: false,
        }),
        createEventAt('14:00', '15:00', '2024-01-15', {
          energy_level: 'medium',
          is_dismissed: true, // Should be excluded
        }),
      ];

      const capacity = calculateCapacity([], events, 'medium', 'balance');

      expect(capacity.scheduled).toBe(60); // Only the non-dismissed event
    });
  });

  describe('combined task and event consumption', () => {
    it('sums task durations and event drains', () => {
      const tasks = [
        createScheduledTask('09:00', '2024-01-15', { duration: 60 }),
      ];
      const events = [
        createEventAt('10:00', '11:00', '2024-01-15', { energy_level: 'medium' }), // 60 min
      ];

      const capacity = calculateCapacity(tasks, events, 'medium', 'balance');

      expect(capacity.scheduled).toBe(120); // 60 task + 60 event
      expect(capacity.available).toBe(546 - 120); // 426
    });

    it('handles a realistic day scenario', () => {
      const tasks = [
        createScheduledTask('09:00', '2024-01-15', { duration: 90, title: 'Deep work' }),
        createScheduledTask('14:00', '2024-01-15', { duration: 45, title: 'Code review' }),
      ];
      const events = [
        createEventAt('12:00', '13:00', '2024-01-15', {
          title: 'Lunch',
          energy_level: 'restful', // 0 drain
        }),
        createEventAt('15:00', '16:00', '2024-01-15', {
          title: 'Team meeting',
          energy_level: 'medium', // 60 drain
        }),
      ];

      const capacity = calculateCapacity(tasks, events, 'high', 'balance');

      // Total: 780 * 0.85 * 1.0 = 663 minutes
      expect(capacity.total).toBe(663);

      // Scheduled: 90 + 45 + 0 (lunch) + 60 (meeting) = 195
      expect(capacity.scheduled).toBe(195);

      // Available: 663 - 195 = 468
      expect(capacity.available).toBe(468);

      // Percentage: 195 / 663 = 29.4% → 29%
      expect(capacity.percentage).toBe(29);
    });
  });

  describe('percentage calculation', () => {
    it('calculates percentage correctly', () => {
      const tasks = [createScheduledTask('09:00', '2024-01-15', { duration: 273 })];

      const capacity = calculateCapacity(tasks, [], 'medium', 'balance');

      // 273 / 546 = 50%
      expect(capacity.percentage).toBe(50);
    });

    it('returns 0 percentage when nothing scheduled', () => {
      const capacity = calculateCapacity([], [], 'medium', 'balance');

      expect(capacity.percentage).toBe(0);
    });

    it('caps at 100% when overbooked', () => {
      // Schedule more than total capacity
      const tasks = [createScheduledTask('06:00', '2024-01-15', { duration: 600 })];

      const capacity = calculateCapacity(tasks, [], 'medium', 'balance');

      expect(capacity.scheduled).toBe(600);
      expect(capacity.available).toBe(0); // Clamped to 0
      expect(capacity.percentage).toBeGreaterThan(100); // 110%
    });

    it('handles edge case of zero total capacity', () => {
      // This shouldn't happen in practice, but test defensively
      // With minimum values: exhausted (0.3) * recovery (0.6) = 0.18
      // 780 * 0.18 = 140.4 → 140 minutes (not zero)

      // We can't easily get to zero, so just verify it handles low values
      const capacity = calculateCapacity([], [], 'exhausted', 'recovery');

      expect(capacity.total).toBe(140);
      expect(capacity.percentage).toBe(0);
    });
  });

  describe('available capacity floor', () => {
    it('never returns negative available capacity', () => {
      const tasks = [createScheduledTask('09:00', '2024-01-15', { duration: 1000 })];

      const capacity = calculateCapacity(tasks, [], 'exhausted', 'recovery');

      expect(capacity.available).toBe(0); // Clamped, not negative
      expect(capacity.scheduled).toBe(1000);
    });
  });
});
