import type { Task } from '@/types/task';
import { TaskCard } from './TaskCard';
import { Inbox, Sparkles, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask?: (id: string) => void;
  onScheduleToToday?: (id: string) => void;
  onOptimizeAll?: () => Promise<{ scheduled: Task[]; unscheduled: Task[] }>;
  isScheduling?: boolean;
  title?: string;
  /** Draft mode: tasks that couldn't be scheduled */
  draftUnscheduledTasks?: Task[];
  /** Callback to manually schedule an unscheduled task */
  onScheduleUnscheduled?: (taskId: string, time: string) => void;
  /** Callback to schedule task for tomorrow */
  onScheduleTomorrow?: (taskId: string) => void;
}

export function TaskList({
  tasks,
  onToggleTask,
  onDeleteTask,
  onEditTask,
  onScheduleToToday,
  onOptimizeAll,
  isScheduling = false,
  title = "Backlog",
  draftUnscheduledTasks = [],
  onScheduleUnscheduled,
  onScheduleTomorrow,
}: TaskListProps) {
  const uncompletedTasks = tasks.filter(t => !t.completed);

  return (
    <div className="bg-card rounded-3xl shadow-card border border-border/30 overflow-hidden">
      {/* Header - simplified, no counter */}
      <div className="px-4 py-3.5 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
            <Inbox className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>

        {/* Single Optimize All button */}
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

      {/* Task list */}
      <div className="p-3 space-y-2.5 max-h-[400px] overflow-y-auto scrollbar-hide">
        {/* Draft mode: Unscheduled tasks section */}
        {draftUnscheduledTasks.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 px-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Couldn't schedule ({draftUnscheduledTasks.length})
              </span>
            </div>
            <div className="space-y-2">
              {draftUnscheduledTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200/50 dark:border-amber-800/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {task.duration}m · No available slot
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {onScheduleUnscheduled && (
                        <button
                          onClick={() => {
                            // Simple prompt for time - could be replaced with a time picker
                            const time = prompt('Enter time (HH:MM):', '09:00');
                            if (time && /^\d{2}:\d{2}$/.test(time)) {
                              onScheduleUnscheduled(task.id, time);
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                        >
                          <Clock className="w-3 h-3" />
                          Set time
                        </button>
                      )}
                      {onScheduleTomorrow && (
                        <button
                          onClick={() => onScheduleTomorrow(task.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                        >
                          <Calendar className="w-3 h-3" />
                          Tomorrow
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && draftUnscheduledTasks.length === 0 ? (
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
                onScheduleToToday={onScheduleToToday}
                onEdit={onEditTask}
                draggable
                showCompletionToggle={false}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
