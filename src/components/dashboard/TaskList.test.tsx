import { render, screen } from '@testing-library/react';
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
  availability_preset: 'any',
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

  it('shows empty state when no tasks', () => {
    render(
      <TaskList
        tasks={[]}
        onToggleTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onDeferTask={vi.fn()}
      />
    );

    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
  });
});
