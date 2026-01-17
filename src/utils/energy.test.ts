import { describe, expect, it } from 'vitest';
import { getDailyEnergyMultiplier, getEventDrainMinutes } from './energy';

const baseEvent = {
  id: 'event-1',
  title: 'Meeting',
  start_time: '2024-01-01T10:00:00Z',
  end_time: '2024-01-01T11:00:00Z',
  is_external: false,
};

describe('energy utils', () => {
  it('maps daily energy multipliers', () => {
    expect(getDailyEnergyMultiplier('exhausted')).toBe(0.3);
    expect(getDailyEnergyMultiplier('energized')).toBe(1);
  });

  it('respects explicit event drain', () => {
    expect(
      getEventDrainMinutes({ ...baseEvent, energy_drain: 90 })
    ).toBe(90);
  });

  it('calculates drain from duration and energy level', () => {
    const drained = getEventDrainMinutes({
      ...baseEvent,
      energy_level: 'high',
    });
    expect(drained).toBe(90);
  });
});
