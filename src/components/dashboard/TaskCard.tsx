import { Check, Clock, Trash2, ArrowRight, Lock, Unlock, GripVertical } from 'lucide-react';
import type { Task } from '@/types/task';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDefer?: (id: string) => void;
  onLockToggle?: (id: string) => void;
  compact?: boolean;
  draggable?: boolean;
}

const priorityColors = {
  low: 'border-l-muted-foreground/30',
  medium: 'border-l-accent-foreground',
  high: 'border-l-primary',
};

const energyBadges = {
  low: { bg: 'bg-secondary', text: 'text-muted-foreground' },
  medium: { bg: 'bg-accent', text: 'text-accent-foreground' },
  high: { bg: 'bg-primary/10', text: 'text-primary' },
};

export function TaskCard({ 
  task, 
  onToggle, 
  onDelete, 
  onDefer,
  onLockToggle,
  compact = false, 
  draggable = false 
}: TaskCardProps) {
  return (
    <div
      className={cn(
        "group relative bg-card rounded-xl shadow-soft border border-border/50 transition-all duration-200 border-l-4",
        priorityColors[task.priority],
        "hover:shadow-card hover:border-border",
        task.completed && "opacity-50",
        compact ? "p-3" : "p-4",
        draggable && "cursor-grab active:cursor-grabbing"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        {draggable && (
          <div className="flex-shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        
        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className={cn(
            "flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
            task.completed
              ? "bg-success border-success"
              : "border-muted-foreground/40 hover:border-primary"
          )}
        >
          {task.completed && (
            <Check className="w-3 h-3 text-success-foreground" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-medium text-sm leading-snug transition-all duration-200",
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
                <span className="text-xs">
                  {task.scheduled_time}
                  {task.duration && ` · ${task.duration}m`}
                </span>
              </div>
            )}
            
            {!task.scheduled_time && task.duration && (
              <span className="text-xs text-muted-foreground">
                {task.duration}m
              </span>
            )}
            
            {/* Energy badge */}
            <span className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize",
              energyBadges[task.energy_level].bg,
              energyBadges[task.energy_level].text
            )}>
              {task.energy_level} focus
            </span>
            
            {/* Lock indicator */}
            {task.is_locked && (
              <Lock className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onLockToggle && (
            <button
              onClick={() => onLockToggle(task.id)}
              className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              title={task.is_locked ? "Unlock time" : "Lock time"}
            >
              {task.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>
          )}
          
          {onDefer && !task.completed && (
            <button
              onClick={() => onDefer(task.id)}
              className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              title="Move to tomorrow"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
