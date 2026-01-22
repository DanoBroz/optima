import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardPanels } from './DashboardPanels';
import type { CalendarEvent, DayCapacity, DailyEnergy, Task } from '@/types/task';


let taskId = 0;
const buildTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${taskId++}`,
  title: 'Task title',
  completed: false,
  duration: 30,
  priority: 'medium',
  energy_level: 'medium',
  motivation_level: 'neutral',
  availability_preset: 'any',
  is_locked: false,
  order_index: 0,
  scheduled_time: null,
  scheduled_date: null,
  ...overrides,
});

const buildEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: crypto.randomUUID(),
  title: 'Meeting',
  start_time: '2024-01-01T10:00:00Z',
  end_time: '2024-01-01T11:00:00Z',
  is_external: false,
  ...overrides,
});

const baseEnergy: DailyEnergy = {
  id: 'energy-1',
  date: '2024-01-01',
  energy_level: 'medium',
  notes: null,
};

const baseCapacity: DayCapacity = {
  total: 480,
  scheduled: 120,
  available: 360,
  percentage: 25,
};

describe('DashboardPanels', () => {
  it('renders the tasks tab content', () => {
    render(
      <DashboardPanels
        activeTab="tasks"
        scheduledTasks={[buildTask({ id: 'scheduled-1', scheduled_time: '09:00' })]}
        unscheduledTasks={[buildTask({ id: 'unscheduled-1' })]}
        tasks={[buildTask({ id: 'task-1' })]}
        events={[buildEvent()]}
        dailyEnergy={baseEnergy}
        capacity={baseCapacity}
        isScheduling={false}
        onEventClick={vi.fn()}
        onRestoreEvent={vi.fn()}
        onOpenEventModal={vi.fn()}
        onOpenSyncModal={vi.fn()}
        taskActions={{
          toggle: vi.fn(),
          remove: vi.fn(),
          defer: vi.fn(),
          reschedule: vi.fn(),
          autoSchedule: vi.fn(),
          autoScheduleSelected: vi.fn().mockResolvedValue({ scheduled: [], unscheduled: [] }),
          autoScheduleBacklog: vi.fn().mockResolvedValue({ scheduled: [], unscheduled: [] }),
          moveToBacklog: vi.fn(),
          toggleLock: vi.fn(),
        }}
        energyActions={{
          setLevel: vi.fn(),
        }}
        dayIntention="balance"
        intentionActions={{
          set: vi.fn(),
        }}
      />
    );

    expect(screen.getAllByText("How's your energy today?")).toHaveLength(2);
    expect(screen.getAllByText('Backlog').length).toBeGreaterThan(0);
  });
});
