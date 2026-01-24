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
    getByDateRange: vi.fn(),
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
    // Default mock implementations
    vi.mocked(taskRepository.getAll).mockResolvedValue([]);
    vi.mocked(eventRepository.getByDateRange).mockResolvedValue([]);
    vi.mocked(energyRepository.getByDate).mockResolvedValue(null);
  });

  describe('initial data loading', () => {
    it('loads tasks, events, and energy on mount', async () => {
      vi.mocked(taskRepository.getAll).mockResolvedValue([baseTask()]);
      vi.mocked(eventRepository.getByDateRange).mockResolvedValue([baseEvent()]);
      vi.mocked(energyRepository.getByDate).mockResolvedValue(baseEnergy());

      const { result } = renderHook(() => useTasks(new Date('2024-01-01T12:00:00')));

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
        expect(result.current.events).toHaveLength(1);
        expect(result.current.dailyEnergy?.energy_level).toBe('medium');
      });
    });

    it('handles empty data gracefully', async () => {
      const { result } = renderHook(() => useTasks(new Date('2024-01-01T12:00:00')));

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(0);
        expect(result.current.events).toHaveLength(0);
        expect(result.current.dailyEnergy).toBeNull();
        expect(result.current.loading).toBe(false);
      });
    });

    it('calls repositories with correct parameters', async () => {
      renderHook(() => useTasks(new Date('2024-01-15T12:00:00')));

      await waitFor(() => {
        expect(taskRepository.getAll).toHaveBeenCalled();
        expect(eventRepository.getByDateRange).toHaveBeenCalledWith(
          '2024-01-15T00:00:00Z',
          '2024-01-15T23:59:59Z'
        );
        expect(energyRepository.getByDate).toHaveBeenCalledWith('2024-01-15');
      });
    });
  });

  describe('task categorization', () => {
    it('separates scheduled and unscheduled tasks', async () => {
      const scheduledTask = baseTask({
        id: 'scheduled',
        scheduled_time: '09:00',
        scheduled_date: '2024-01-01',
      });
      const backlogTask = baseTask({
        id: 'backlog',
        scheduled_time: null,
        scheduled_date: null,
      });

      vi.mocked(taskRepository.getAll).mockResolvedValue([scheduledTask, backlogTask]);

      const { result } = renderHook(() => useTasks(new Date('2024-01-01T12:00:00')));

      await waitFor(() => {
        expect(result.current.scheduledTasks).toHaveLength(1);
        expect(result.current.scheduledTasks[0].id).toBe('scheduled');
        expect(result.current.unscheduledTasks).toHaveLength(1);
        expect(result.current.unscheduledTasks[0].id).toBe('backlog');
      });
    });

    it('identifies today backlog tasks', async () => {
      const todayBacklog = baseTask({
        id: 'today-backlog',
        scheduled_time: null,
        scheduled_date: '2024-01-01',
      });
      const noDateBacklog = baseTask({
        id: 'no-date',
        scheduled_time: null,
        scheduled_date: null,
      });

      vi.mocked(taskRepository.getAll).mockResolvedValue([todayBacklog, noDateBacklog]);

      const { result } = renderHook(() => useTasks(new Date('2024-01-01T12:00:00')));

      await waitFor(() => {
        expect(result.current.todayBacklogTasks).toHaveLength(1);
        expect(result.current.todayBacklogTasks[0].id).toBe('today-backlog');
        expect(result.current.trueUnscheduledTasks).toHaveLength(1);
        expect(result.current.trueUnscheduledTasks[0].id).toBe('no-date');
      });
    });

    it('identifies deferred tasks', async () => {
      const deferredTask = baseTask({
        id: 'deferred',
        scheduled_time: null,
        scheduled_date: '2024-01-05', // Future date
      });

      vi.mocked(taskRepository.getAll).mockResolvedValue([deferredTask]);

      const { result } = renderHook(() => useTasks(new Date('2024-01-01T12:00:00')));

      await waitFor(() => {
        expect(result.current.deferredTasks).toHaveLength(1);
        expect(result.current.deferredTasks[0].id).toBe('deferred');
      });
    });
  });

  describe('capacity calculation', () => {
    it('calculates capacity based on energy level', async () => {
      vi.mocked(energyRepository.getByDate).mockResolvedValue(
        baseEnergy({ energy_level: 'high' })
      );

      const { result } = renderHook(() => useTasks(new Date('2024-01-01T12:00:00')));

      await waitFor(() => {
        expect(result.current.capacity).toBeDefined();
        expect(result.current.capacity.total).toBeGreaterThan(0);
      });
    });

    it('accounts for scheduled tasks in capacity', async () => {
      const scheduledTask = baseTask({
        scheduled_time: '09:00',
        scheduled_date: '2024-01-01',
        duration: 60,
      });

      vi.mocked(taskRepository.getAll).mockResolvedValue([scheduledTask]);

      const { result } = renderHook(() => useTasks(new Date('2024-01-01T12:00:00')));

      await waitFor(() => {
        expect(result.current.capacity.scheduled).toBeGreaterThan(0);
      });
    });
  });

  describe('actions interface', () => {
    it('provides task actions', async () => {
      const { result } = renderHook(() => useTasks(new Date('2024-01-01T12:00:00')));

      await waitFor(() => {
        expect(result.current.actions.task).toBeDefined();
        expect(result.current.actions.task.add).toBeInstanceOf(Function);
        expect(result.current.actions.task.toggle).toBeInstanceOf(Function);
        expect(result.current.actions.task.remove).toBeInstanceOf(Function);
        expect(result.current.actions.task.update).toBeInstanceOf(Function);
        expect(result.current.actions.task.reschedule).toBeInstanceOf(Function);
      });
    });

    it('provides event actions', async () => {
      const { result } = renderHook(() => useTasks(new Date('2024-01-01T12:00:00')));

      await waitFor(() => {
        expect(result.current.actions.event).toBeDefined();
        expect(result.current.actions.event.add).toBeInstanceOf(Function);
        expect(result.current.actions.event.update).toBeInstanceOf(Function);
        expect(result.current.actions.event.remove).toBeInstanceOf(Function);
      });
    });

    it('provides energy and intention actions', async () => {
      const { result } = renderHook(() => useTasks(new Date('2024-01-01T12:00:00')));

      await waitFor(() => {
        expect(result.current.actions.energy.setLevel).toBeInstanceOf(Function);
        expect(result.current.actions.intention.set).toBeInstanceOf(Function);
      });
    });

    it('provides refresh actions', async () => {
      const { result } = renderHook(() => useTasks(new Date('2024-01-01T12:00:00')));

      await waitFor(() => {
        expect(result.current.actions.refresh.tasks).toBeInstanceOf(Function);
        expect(result.current.actions.refresh.events).toBeInstanceOf(Function);
        expect(result.current.actions.refresh.energy).toBeInstanceOf(Function);
      });
    });

    it('provides scheduling actions', async () => {
      const { result } = renderHook(() => useTasks(new Date('2024-01-01T12:00:00')));

      await waitFor(() => {
        expect(result.current.actions.scheduling.findNextSlotToday).toBeInstanceOf(Function);
        expect(result.current.actions.scheduling.findNextSlotTomorrow).toBeInstanceOf(Function);
        expect(result.current.actions.scheduling.isTimeInPast).toBeInstanceOf(Function);
      });
    });
  });
});
