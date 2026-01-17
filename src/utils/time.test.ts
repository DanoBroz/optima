import { describe, expect, it } from 'vitest';
import { formatDuration, getDayTimeRange, getDurationMinutes } from './time';

describe('time utils', () => {
  it('formats durations cleanly', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(135)).toBe('2h 15m');
  });

  it('calculates duration minutes', () => {
    const start = new Date('2024-01-01T10:00:00Z');
    const end = new Date('2024-01-01T10:30:00Z');
    expect(getDurationMinutes(start, end)).toBe(30);
  });

  it('returns start/end of day strings', () => {
    const range = getDayTimeRange('2024-01-01');
    expect(range).toEqual({
      startOfDay: '2024-01-01T00:00:00Z',
      endOfDay: '2024-01-01T23:59:59Z',
    });
  });
});
