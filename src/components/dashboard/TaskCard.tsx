import { Check, Clock, Trash2, ArrowRight, Lock, Unlock, GripVertical, Inbox } from 'lucide-react';
import type { Task } from '@/types/task';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDefer?: (id: string) => void;
  onLockToggle?: (id: string) => void;
  onMoveToBacklog?: (id: string) => void;
  compact?: boolean;
  draggable?: boolean;
  showCompletionToggle?: boolean;
}

const priorityColors = {
  low: 'bg-muted-foreground/20',
  medium: 'bg-amber-500 dark:bg-amber-400',
  high: 'bg-primary',
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
  compact = false, 
  draggable = false,
  showCompletionToggle = true,
}: TaskCardProps) {
  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl shadow-soft border border-border/30 transition-all duration-200",
        "hover:shadow-card hover:border-border/50",
        task.completed && "opacity-50",
        compact ? "p-3" : "p-3.5",
        draggable && "cursor-grab active:cursor-grabbing"
      )}
    >
      {/* Priority indicator - dot style */}
      <div className={cn(
        "absolute top-3.5 left-3.5 w-2 h-2 rounded-full",
        priorityColors[task.priority]
      )} />

      <div className="flex items-start gap-3 pl-4">
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
          <p
            className={cn(
              "font-semibold text-sm leading-snug transition-all duration-200",
              task.completed && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>

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
            {task.is_locked && (
              <Lock className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Actions */}
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
          
          {onLockToggle && (
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
      </div>
    </div>
  );
}
