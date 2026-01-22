import { renderHook, waitFor } from '@testing-library/react';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTasks } from './useTasks';
import { taskRepository } from '@/data/taskRepository';
import { eventRepository } from '@/data/eventRepository';
import { energyRepository } from '@/data/energyRepository';
import type { Task, CalendarEvent, DailyEnergy } from '@/types/task';

vi.mock('@/data/taskRepository', () => ({
  taskRepository: {
    getAll: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    bulkUpdate: vi.fn(),
  },
}));

vi.mock('@/data/eventRepository', () => ({
  eventRepository: {
    getAll: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    bulkAdd: vi.fn(),
  },
}));

vi.mock('@/data/energyRepository', () => ({
  energyRepository: {
    getByDate: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    session: null,
    loading: false,
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithGitHub: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const baseTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Task',
  completed: false,
  duration: 30,
  priority: 'medium',
  energy_level: 'medium',
  motivation_level: 'neutral',
  availability_windows: [],
  is_locked: false,
  order_index: 0,
  scheduled_time: null,
  scheduled_date: null,
  ...overrides,
});

const baseEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'event-1',
  title: 'Meeting',
  start_time: '2024-01-01T09:00:00Z',
  end_time: '2024-01-01T10:00:00Z',
  is_external: false,
  ...overrides,
});

const baseEnergy = (overrides: Partial<DailyEnergy> = {}): DailyEnergy => ({
  id: 'energy-1',
  date: '2024-01-01',
  energy_level: 'medium',
  notes: null,
  ...overrides,
});

describe('useTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads tasks, events, and energy on mount', async () => {
    vi.mocked(taskRepository.getAll).mockResolvedValue([baseTask()]);
    vi.mocked(eventRepository.getAll).mockResolvedValue([baseEvent()]);
    vi.mocked(energyRepository.getByDate).mockResolvedValue(baseEnergy());

    const { result } = renderHook(() => useTasks(new Date('2024-01-01T12:00:00')));

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.events).toHaveLength(1);
      expect(result.current.dailyEnergy?.energy_level).toBe('medium');
    });
  });
});
