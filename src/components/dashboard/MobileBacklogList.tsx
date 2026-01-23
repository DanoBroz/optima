import { useState } from 'react';
import type { Task } from '@/types/task';
import { SwipeableTaskCard } from './SwipeableTaskCard';
import { TaskActionDrawer } from './TaskActionDrawer';
import { Inbox, Sparkles, ChevronDown, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBacklogListProps {
  /** Tasks scheduled for today with no time */
  todayTasks: Task[];
  /** Tasks with no date (true backlog) */
  unscheduledTasks: Task[];
  /** Tasks with future dates (scheduled for later) */
  deferredTasks: Task[];
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
  todayTasks,
  unscheduledTasks,
  deferredTasks,
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
  const [deferredExpanded, setDeferredExpanded] = useState(false);

  const allTasks = [...todayTasks, ...unscheduledTasks, ...deferredTasks];
  const uncompletedTasks = allTasks.filter(t => !t.completed);
  const totalCount = allTasks.length;

  const renderTaskCard = (task: Task, index: number) => (
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
        onRightSwipe={onScheduleToToday}
        rightSwipeAction="schedule"
        leftSwipeAction="delete"
        onMoveToBacklog={undefined}
        onTap={() => {
          setDrawerTask(task);
          setDrawerOpen(true);
        }}
        compact
      />
    </div>
  );

  return (
    <div className="bg-card rounded-3xl shadow-card border border-border/30 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
            <Inbox className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-sm">Backlog</h3>
        </div>

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

      {/* Backlog sections */}
      <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
        {totalCount === 0 ? (
          <div className="py-10 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-secondary/50 flex items-center justify-center">
              <Inbox className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">No tasks yet</p>
            <p className="text-muted-foreground/70 text-xs mt-1">Add a task to get started</p>
          </div>
        ) : (
          <>
            {/* Today's tasks section - highest priority */}
            {todayTasks.length > 0 && (
              <div className="p-3 pb-1">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">Today</span>
                  <span className="text-xs text-muted-foreground">({todayTasks.length})</span>
                </div>
                <div className="space-y-2.5">
                  {todayTasks.map((task, index) => renderTaskCard(task, index))}
                </div>
              </div>
            )}

            {/* Unscheduled section */}
            {unscheduledTasks.length > 0 && (
              <div className="p-3 pb-1">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Inbox className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">Unscheduled</span>
                  <span className="text-xs text-muted-foreground/70">({unscheduledTasks.length})</span>
                </div>
                <div className="space-y-2.5">
                  {unscheduledTasks.map((task, index) => renderTaskCard(task, index))}
                </div>
              </div>
            )}

            {/* Scheduled for later section - collapsed by default */}
            {deferredTasks.length > 0 && (
              <div className="p-3 pt-1">
                <button
                  onClick={() => setDeferredExpanded(!deferredExpanded)}
                  className="flex items-center gap-2 mb-2 px-1 w-full text-left group"
                >
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span className="text-xs font-semibold text-muted-foreground/70 group-hover:text-muted-foreground">
                    Scheduled for later
                  </span>
                  <span className="text-xs text-muted-foreground/50">({deferredTasks.length})</span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 text-muted-foreground/50 ml-auto transition-transform",
                      deferredExpanded && "rotate-180"
                    )}
                  />
                </button>
                {deferredExpanded && (
                  <div className="space-y-2.5">
                    {deferredTasks.map((task, index) => renderTaskCard(task, index))}
                  </div>
                )}
              </div>
            )}
          </>
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
