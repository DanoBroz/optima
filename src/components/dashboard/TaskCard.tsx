import { Check, Clock, Trash2, ArrowRight, Lock, Unlock, GripVertical, Inbox, ArrowUp, Sparkles, Pencil } from 'lucide-react';
import type { Task } from '@/types/task';
import type { TaskChangeType } from '@/hooks/useDraft';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDefer?: (id: string) => void;
  onLockToggle?: (id: string) => void;
  onMoveToBacklog?: (id: string) => void;
  onEdit?: (id: string) => void;
  compact?: boolean;
  draggable?: boolean;
  showCompletionToggle?: boolean;
  /** Hide all action buttons (used in draft mode) */
  hideActions?: boolean;
  /** Draft mode change indicator */
  changeType?: TaskChangeType;
  /** Original time for moved tasks (shown as "from HH:MM") */
  originalTime?: string | null;
}

const priorityIndicators = {
  low: { marks: '!', color: 'text-muted-foreground' },
  medium: { marks: '!!', color: 'text-amber-500 dark:text-amber-400' },
  high: { marks: '!!!', color: 'text-destructive' },
};

const energyBadges = {
  low: { bg: 'bg-secondary', text: 'text-muted-foreground' },
  medium: { bg: 'bg-accent', text: 'text-accent-foreground' },
  high: { bg: 'bg-primary/15', text: 'text-primary' },
};

export function TaskCard({
  task,
  onToggle,
  onDelete,
  onDefer,
  onLockToggle,
  onMoveToBacklog,
  onEdit,
  compact = false,
  draggable = false,
  showCompletionToggle = true,
  hideActions = false,
  changeType,
  originalTime,
}: TaskCardProps) {
  // Determine border styling based on change type
  const borderStyle = changeType === 'moved' 
    ? 'ring-2 ring-amber-400/50 border-amber-400/30'
    : changeType === 'new'
    ? 'ring-2 ring-emerald-400/50 border-emerald-400/30'
    : '';

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl shadow-soft border border-border/30 transition-all duration-200",
        "hover:shadow-card hover:border-border/50",
        task.completed && "opacity-50",
        compact ? "p-3" : "p-3.5",
        draggable && "cursor-grab active:cursor-grabbing",
        borderStyle
      )}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        {draggable && (
          <div className="flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors mt-0.5">
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        
        {/* Checkbox - only show if showCompletionToggle is true */}
        {showCompletionToggle && (
          <button
            onClick={() => onToggle(task.id)}
            className={cn(
              "flex-shrink-0 w-5 h-5 rounded-lg border-2 transition-all duration-200 flex items-center justify-center mt-0.5",
              task.completed
                ? "bg-success border-success"
                : "border-border hover:border-primary"
            )}
          >
            {task.completed && (
              <Check className="w-3 h-3 text-success-foreground" strokeWidth={3} />
            )}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {/* Priority indicator - exclamation marks */}
            <span className={cn(
              "text-xs font-bold flex-shrink-0",
              priorityIndicators[task.priority].color
            )}>
              {priorityIndicators[task.priority].marks}
            </span>
            <p
              className={cn(
                "font-semibold text-sm leading-snug transition-all duration-200",
                task.completed && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </p>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {task.scheduled_time && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span className="text-xs font-medium">
                  {task.scheduled_time}
                  {task.duration && ` · ${task.duration}m`}
                </span>
              </div>
            )}
            
            {!task.scheduled_time && task.duration && (
              <span className="text-xs text-muted-foreground font-medium">
                {task.duration}m
              </span>
            )}
            
            {/* Energy badge */}
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize",
              energyBadges[task.energy_level].bg,
              energyBadges[task.energy_level].text
            )}>
              {task.energy_level}
            </span>
            
            {/* Lock indicator */}
            {task.is_locked && !changeType && (
              <Lock className="w-3 h-3 text-muted-foreground" />
            )}

            {/* Draft change badges */}
            {changeType === 'moved' && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <ArrowUp className="w-3 h-3" />
                {originalTime ? `from ${originalTime}` : 'MOVED'}
              </span>
            )}
            {changeType === 'new' && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Sparkles className="w-3 h-3" />
                NEW
              </span>
            )}
          </div>
        </div>

        {/* Actions - hidden in draft mode */}
        {!hideActions && (
          <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onMoveToBacklog && !task.completed && task.scheduled_time && (
              <button
                onClick={() => onMoveToBacklog(task.id)}
                className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                title="Move to backlog"
              >
                <Inbox className="w-4 h-4" />
              </button>
            )}

            {onEdit && (
              <button
                onClick={() => onEdit(task.id)}
                className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                title="Edit task"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}

            {onLockToggle && !task.completed && (
              <button
                onClick={() => onLockToggle(task.id)}
                className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                title={task.is_locked ? "Unlock time" : "Lock time"}
              >
                {task.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </button>
            )}

            {onDefer && !task.completed && (
              <button
                onClick={() => onDefer(task.id)}
                className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                title="Move to tomorrow"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => onDelete(task.id)}
              className="p-2 hover:bg-destructive/10 rounded-xl text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
