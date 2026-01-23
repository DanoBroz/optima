import { Calendar, Check, Clock, Trash2, ArrowRight, Lock, Unlock, GripVertical, Inbox, ArrowUp, Sparkles, Pencil, MoreVertical } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Task } from '@/types/task';
import type { TaskChangeType } from '@/hooks/useDraft';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

function formatScheduledDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM d');
}

// Content visibility thresholds based on available height
const HEIGHT_THRESHOLDS = {
  minimal: 48,    // Just title + time
  compact: 64,    // + energy badge
  normal: 80,     // + priority indicator
  expanded: 96,   // All content with comfortable spacing
};

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDefer?: (id: string) => void;
  onLockToggle?: (id: string) => void;
  onMoveToBacklog?: (id: string) => void;
  onScheduleToToday?: (id: string) => void;
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
  /** Available height for the card (enables progressive collapse) */
  availableHeight?: number;
  /** Card is width-constrained due to column overlap */
  isWidthConstrained?: boolean;
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
  onScheduleToToday,
  onEdit,
  compact = false,
  draggable = false,
  showCompletionToggle = true,
  hideActions = false,
  changeType,
  originalTime,
  availableHeight,
  isWidthConstrained = false,
}: TaskCardProps) {
  // Determine content visibility based on available height
  const isHeightConstrained = availableHeight !== undefined;
  const showEnergyBadge = !isHeightConstrained || availableHeight >= HEIGHT_THRESHOLDS.compact;
  const showPriorityMeta = !isHeightConstrained || availableHeight >= HEIGHT_THRESHOLDS.normal;
  const showDraftBadges = !isHeightConstrained || availableHeight >= HEIGHT_THRESHOLDS.normal;
  const isMinimal = isHeightConstrained && availableHeight < HEIGHT_THRESHOLDS.compact;
  const isCompactHeight = isHeightConstrained && availableHeight < HEIGHT_THRESHOLDS.normal;

  // Width-constrained adjustments (when cards overlap)
  const showCheckbox = showCompletionToggle && !isWidthConstrained;
  const showEnergyBadgeWidth = showEnergyBadge && !isWidthConstrained;
  const showInlineActions = !hideActions && !isWidthConstrained;
  // Determine border styling based on change type
  const borderStyle = changeType === 'moved' 
    ? 'ring-2 ring-amber-400/50 border-amber-400/30'
    : changeType === 'new'
    ? 'ring-2 ring-emerald-400/50 border-emerald-400/30'
    : '';

  // Adjust padding based on height constraint
  const paddingClass = isMinimal ? "p-2" : isCompactHeight ? "p-2.5" : compact ? "p-3" : "p-3.5";

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl shadow-soft border border-border/30 transition-all duration-200",
        "hover:shadow-card hover:border-border/50",
        task.completed && "opacity-50",
        paddingClass,
        draggable && "cursor-grab active:cursor-grabbing",
        borderStyle,
        isHeightConstrained && "h-full overflow-hidden"
      )}
    >
      <div className={cn(
        "flex items-start gap-3",
        isHeightConstrained && "h-full"
      )}>
        {/* Drag handle */}
        {draggable && (
          <div className="flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors mt-0.5">
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        
        {/* Checkbox - hidden when width-constrained */}
        {showCheckbox && (
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
              "font-bold flex-shrink-0",
              isMinimal ? "text-[10px]" : "text-xs",
              priorityIndicators[task.priority].color
            )}>
              {priorityIndicators[task.priority].marks}
            </span>
            <p
              className={cn(
                "font-semibold leading-snug transition-all duration-200",
                isMinimal ? "text-xs line-clamp-1" : "text-sm line-clamp-2",
                task.completed && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </p>
          </div>

          {/* Meta info - always show time, conditionally show other elements */}
          <div className={cn(
            "flex items-center gap-2 flex-wrap",
            isMinimal ? "mt-0.5" : "mt-1.5"
          )}>
            {task.scheduled_time && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className={isMinimal ? "w-2.5 h-2.5" : "w-3 h-3"} />
                <span className={cn(
                  "font-medium",
                  isMinimal ? "text-[10px]" : "text-xs"
                )}>
                  {task.scheduled_time}
                  {task.duration && ` · ${task.duration}m`}
                </span>
              </div>
            )}

            {!task.scheduled_time && task.duration && (
              <span className={cn(
                "text-muted-foreground font-medium",
                isMinimal ? "text-[10px]" : "text-xs"
              )}>
                {task.duration}m
              </span>
            )}

            {/* Scheduled date badge - show for backlog items with a target date */}
            {showPriorityMeta && !task.scheduled_time && task.scheduled_date && (
              <div className="flex items-center gap-1 text-primary">
                <Calendar className="w-3 h-3" />
                <span className="text-xs font-medium">
                  {formatScheduledDate(task.scheduled_date)}
                </span>
              </div>
            )}

            {/* Energy badge - hidden when height is minimal or width-constrained */}
            {showEnergyBadgeWidth && (
              <span className={cn(
                "font-semibold rounded-full capitalize",
                isCompactHeight ? "text-[8px] px-1.5 py-0" : "text-[10px] px-2 py-0.5",
                energyBadges[task.energy_level].bg,
                energyBadges[task.energy_level].text
              )}>
                {task.energy_level}
              </span>
            )}

            {/* Lock indicator - hidden when minimal */}
            {showPriorityMeta && task.is_locked && !changeType && (
              <Lock className="w-3 h-3 text-muted-foreground" />
            )}

            {/* Draft change badges - hidden when height constrained */}
            {showDraftBadges && changeType === 'moved' && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <ArrowUp className="w-3 h-3" />
                {originalTime ? `from ${originalTime}` : 'MOVED'}
              </span>
            )}
            {showDraftBadges && changeType === 'new' && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Sparkles className="w-3 h-3" />
                NEW
              </span>
            )}
          </div>
        </div>

        {/* Inline actions - shown on hover when not width-constrained */}
        {showInlineActions && (
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

            {onScheduleToToday && !task.completed && !task.scheduled_time && (
              <button
                onClick={() => onScheduleToToday(task.id)}
                className="p-2 hover:bg-primary/10 rounded-xl text-muted-foreground hover:text-primary transition-colors"
                title="Schedule for today"
              >
                <Calendar className="w-4 h-4" />
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

        {/* Popover actions - for width-constrained cards on desktop */}
        {!hideActions && isWidthConstrained && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex-shrink-0 p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end" side="left">
              <div className="flex flex-col gap-1">
                {!task.completed && (
                  <button
                    onClick={() => onToggle(task.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary rounded-lg text-left transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Complete
                  </button>
                )}
                {task.completed && (
                  <button
                    onClick={() => onToggle(task.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary rounded-lg text-left transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Uncomplete
                  </button>
                )}
                {onMoveToBacklog && !task.completed && task.scheduled_time && (
                  <button
                    onClick={() => onMoveToBacklog(task.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary rounded-lg text-left transition-colors"
                  >
                    <Inbox className="w-4 h-4" />
                    Move to backlog
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(task.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary rounded-lg text-left transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                )}
                {onLockToggle && !task.completed && (
                  <button
                    onClick={() => onLockToggle(task.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary rounded-lg text-left transition-colors"
                  >
                    {task.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {task.is_locked ? 'Unlock time' : 'Lock time'}
                  </button>
                )}
                {onDefer && !task.completed && (
                  <button
                    onClick={() => onDefer(task.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary rounded-lg text-left transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Move to tomorrow
                  </button>
                )}
                <button
                  onClick={() => onDelete(task.id)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive rounded-lg text-left transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
