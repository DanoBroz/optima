import { useState } from 'react';
import type { Task } from '@/types/task';
import { TaskCard } from './TaskCard';
import { Inbox, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onDeferTask: (id: string) => void;
  onOptimizeSelected?: (selectedIds: string[]) => Promise<{ scheduled: Task[]; unscheduled: Task[] }>;
  onOptimizeAll?: () => Promise<{ scheduled: Task[]; unscheduled: Task[] }>;
  isScheduling?: boolean;
  title?: string;
}

export function TaskList({ 
  tasks, 
  onToggleTask, 
  onDeleteTask, 
  onDeferTask,
  onOptimizeSelected,
  onOptimizeAll,
  isScheduling = false,
  title = "Backlog",
}: TaskListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const uncompletedTasks = tasks.filter(t => !t.completed);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleOptimizeSelected = async () => {
    if (onOptimizeSelected && selectedIds.size > 0) {
      const result = await onOptimizeSelected(Array.from(selectedIds));
      // Only clear selection if no unscheduled tasks remain (modal not needed)
      if (result.unscheduled.length === 0) {
        clearSelection();
      }
    }
  };

  const handleOptimizeAll = async () => {
    if (onOptimizeAll) {
      const result = await onOptimizeAll();
      // Only clear selection if no unscheduled tasks remain (modal not needed)
      if (result.unscheduled.length === 0) {
        clearSelection();
      }
    }
  };

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

      {/* Selection/Optimize controls - always visible when there are tasks and optimize handlers */}
      {tasks.length > 0 && (onOptimizeSelected || onOptimizeAll) && (
        <div className="px-4 py-2.5 border-b border-border/30 bg-secondary/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={clearSelection}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onOptimizeSelected && selectedIds.size > 0 && (
                <button
                  onClick={handleOptimizeSelected}
                  disabled={isScheduling}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    !isScheduling
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  Optimize Selected
                </button>
              )}
              {onOptimizeAll && (
                <button
                  onClick={handleOptimizeAll}
                  disabled={uncompletedTasks.length === 0 || isScheduling}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    uncompletedTasks.length > 0 && !isScheduling
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "bg-secondary text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  Optimize All
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
              className="animate-slide-up flex items-start gap-2"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Selection checkbox - always visible for uncompleted tasks */}
              {!task.completed && (onOptimizeSelected || onOptimizeAll) && (
                <button
                  onClick={() => toggleSelection(task.id)}
                  className={cn(
                    "flex-shrink-0 w-5 h-5 mt-3.5 rounded-md border-2 transition-all duration-200 flex items-center justify-center",
                    selectedIds.has(task.id)
                      ? "bg-primary border-primary"
                      : "border-border hover:border-primary"
                  )}
                >
                  {selectedIds.has(task.id) && (
                    <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                  )}
                </button>
              )}
              
              <div
                className="flex-1"
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
                  showCompletionToggle={false}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
