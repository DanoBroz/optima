import type { Task } from '@/types/task';
import { TaskCard } from './TaskCard';
import { Inbox } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onDeferTask: (id: string) => void;
  title?: string;
}

export function TaskList({ 
  tasks, 
  onToggleTask, 
  onDeleteTask, 
  onDeferTask,
  title = "Backlog",
}: TaskListProps) {
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;

  return (
    <div className="bg-card rounded-3xl shadow-card border border-border/30 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
            <Inbox className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground font-medium bg-secondary px-2.5 py-1 rounded-full">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Task list */}
      <div className="p-3 space-y-2.5 max-h-[400px] overflow-y-auto scrollbar-hide">
        {tasks.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-secondary/50 flex items-center justify-center">
              <Inbox className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">No tasks yet</p>
            <p className="text-muted-foreground/70 text-xs mt-1">Add a task to get started</p>
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
