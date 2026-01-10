import type { Task } from '@/types/task';
import { TaskCard } from './TaskCard';
import { Inbox, Sparkles } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onDeferTask: (id: string) => void;
  title?: string;
  onAutoSchedule?: () => void;
  isScheduling?: boolean;
}

export function TaskList({ 
  tasks, 
  onToggleTask, 
  onDeleteTask, 
  onDeferTask,
  title = "Backlog",
  onAutoSchedule,
  isScheduling
}: TaskListProps) {
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const unscheduledCount = tasks.filter(t => !t.scheduled_time && !t.completed).length;

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
          {onAutoSchedule && unscheduledCount > 0 && (
            <button
              onClick={onAutoSchedule}
              disabled={isScheduling}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isScheduling ? 'animate-spin' : ''}`} />
              {isScheduling ? 'Scheduling...' : 'Auto-schedule'}
            </button>
          )}
        </div>
      </div>

      {/* Task list */}
      <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
        {tasks.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No tasks yet
          </div>
        ) : (
          tasks.map((task, index) => (
            <div
              key={task.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('taskId', task.id);
              }}
            >
              <TaskCard
                task={task}
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
                onDefer={onDeferTask}
                draggable
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
