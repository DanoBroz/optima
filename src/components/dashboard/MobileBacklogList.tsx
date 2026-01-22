import { useState } from 'react';
import type { Task } from '@/types/task';
import { SwipeableTaskCard } from './SwipeableTaskCard';
import { TaskActionDrawer } from './TaskActionDrawer';
import { Inbox, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBacklogListProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onDeferTask: (id: string) => void;
  onEditTask?: (id: string) => void;
  onLockToggle?: (id: string) => void;
  onScheduleToToday: (id: string) => void;
  onOptimizeAll?: () => Promise<{ scheduled: Task[]; unscheduled: Task[] }>;
  isScheduling?: boolean;
}

export function MobileBacklogList({
  tasks,
  onToggleTask,
  onDeleteTask,
  onDeferTask,
  onEditTask,
  onLockToggle,
  onScheduleToToday,
  onOptimizeAll,
  isScheduling = false,
}: MobileBacklogListProps) {
  const [drawerTask, setDrawerTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const uncompletedTasks = tasks.filter(t => !t.completed);

  return (
    <div className="bg-card rounded-3xl shadow-card border border-border/30 overflow-hidden">
      {/* Simplified Header - NO counter badge */}
      <div className="px-4 py-3.5 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
            <Inbox className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-sm">Backlog</h3>
        </div>

        {/* Single "Optimize All" button */}
        {onOptimizeAll && (
          <button
            onClick={onOptimizeAll}
            disabled={uncompletedTasks.length === 0 || isScheduling}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              uncompletedTasks.length > 0 && !isScheduling
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'bg-secondary text-muted-foreground cursor-not-allowed'
            )}
          >
            <Sparkles className="w-3 h-3" />
            Optimize All
          </button>
        )}
      </div>

      {/* Task list with SwipeableTaskCards */}
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
            >
              <SwipeableTaskCard
                task={task}
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
                onDefer={onDeferTask}
                onEdit={onEditTask}
                onLockToggle={onLockToggle}
                // Backlog-specific: right swipe = schedule, left swipe = delete
                onRightSwipe={onScheduleToToday}
                rightSwipeAction="schedule"
                leftSwipeAction="delete"
                // No "Move to Backlog" since we're already in backlog
                onMoveToBacklog={undefined}
                onTap={() => {
                  setDrawerTask(task);
                  setDrawerOpen(true);
                }}
                compact
              />
            </div>
          ))
        )}
      </div>

      {/* Task action drawer - backlog context */}
      <TaskActionDrawer
        task={drawerTask}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onToggle={onToggleTask}
        onDelete={onDeleteTask}
        onDefer={onDeferTask}
        onEdit={onEditTask}
        onLockToggle={onLockToggle}
        onScheduleToToday={onScheduleToToday}
        context="backlog"
      />
    </div>
  );
}
