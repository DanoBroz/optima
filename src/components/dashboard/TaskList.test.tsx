import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskList } from './TaskList';
import type { Task } from '@/types/task';


let taskId = 0;
const buildTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${taskId++}`,
  title: 'Task title',
  completed: false,
  duration: 30,
  priority: 'medium',
  energy_level: 'medium',
  motivation_level: 'neutral',
  is_locked: false,
  order_index: 0,
  scheduled_time: null,
  scheduled_date: null,
  ...overrides,
});

describe('TaskList', () => {
  it('renders tasks and counts', () => {
    render(
      <TaskList
        tasks={[buildTask({ id: 'a' }), buildTask({ id: 'b', completed: true })]}
        onToggleTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onDeferTask={vi.fn()}
      />
    );

    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getAllByText('Task title')).toHaveLength(2);
  });

  it('fires auto-schedule action', async () => {
    const user = userEvent.setup();
    const onAutoSchedule = vi.fn();

    render(
      <TaskList
        tasks={[buildTask({ id: 'a' })]}
        onToggleTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onDeferTask={vi.fn()}
        onAutoSchedule={onAutoSchedule}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Auto-schedule' }));
    expect(onAutoSchedule).toHaveBeenCalledTimes(1);
  });
});
