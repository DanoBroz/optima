import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Check,
  Pencil,
  ArrowRight,
  Lock,
  Unlock,
  Inbox,
  Trash2,
  Clock,
  Undo2,
} from 'lucide-react';
import type { Task } from '@/types/task';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

interface TaskActionDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDefer?: (id: string) => void;
  onLockToggle?: (id: string) => void;
  onMoveToBacklog?: (id: string) => void;
  onEdit?: (id: string) => void;
}

const priorityColors = {
  low: 'bg-muted-foreground/20',
  medium: 'bg-amber-500',
  high: 'bg-primary',
};

const energyBadges = {
  low: { bg: 'bg-secondary', text: 'text-muted-foreground', label: 'Low' },
  medium: { bg: 'bg-accent', text: 'text-accent-foreground', label: 'Medium' },
  high: { bg: 'bg-primary/15', text: 'text-primary', label: 'High' },
};

export function TaskActionDrawer({
  task,
  open,
  onOpenChange,
  onToggle,
  onDelete,
  onDefer,
  onLockToggle,
  onMoveToBacklog,
  onEdit,
}: TaskActionDrawerProps) {
  if (!task) return null;

  const handleAction = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  const handleDelete = () => {
    const taskTitle = task.title;
    onDelete(task.id);
    onOpenChange(false);

    toast('Task deleted', {
      description: taskTitle,
      action: {
        label: 'Undo',
        onClick: () => {
          toast('Undo not available yet');
        },
      },
      duration: 5000,
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-8">
        <DrawerHeader className="text-left px-0">
          <div className="flex items-start gap-3">
            {/* Priority indicator */}
            <div
              className={cn(
                'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                priorityColors[task.priority]
              )}
            />
            <div className="flex-1 min-w-0">
              <DrawerTitle
                className={cn(
                  'text-lg font-semibold',
                  task.completed && 'line-through text-muted-foreground'
                )}
              >
                {task.title}
              </DrawerTitle>

              {/* Meta info */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {task.scheduled_time && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">
                      {task.scheduled_time}
                      {task.duration && ` · ${task.duration}m`}
                    </span>
                  </div>
                )}

                {!task.scheduled_time && task.duration && (
                  <span className="text-sm text-muted-foreground font-medium">
                    {task.duration}m
                  </span>
                )}

                {/* Energy badge */}
                <span
                  className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-full',
                    energyBadges[task.energy_level].bg,
                    energyBadges[task.energy_level].text
                  )}
                >
                  {energyBadges[task.energy_level].label}
                </span>

                {/* Lock indicator */}
                {task.is_locked && (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </DrawerHeader>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {/* Complete/Uncomplete */}
          <ActionButton
            icon={task.completed ? <Undo2 /> : <Check />}
            label={task.completed ? 'Uncomplete' : 'Complete'}
            onClick={() => handleAction(() => onToggle(task.id))}
            variant={task.completed ? 'default' : 'success'}
          />

          {/* Edit */}
          {onEdit && (
            <ActionButton
              icon={<Pencil />}
              label="Edit"
              onClick={() => handleAction(() => onEdit(task.id))}
            />
          )}

          {/* Defer */}
          {onDefer && !task.completed && (
            <ActionButton
              icon={<ArrowRight />}
              label="Tomorrow"
              onClick={() => handleAction(() => onDefer(task.id))}
            />
          )}

          {/* Lock/Unlock */}
          {onLockToggle && !task.completed && (
            <ActionButton
              icon={task.is_locked ? <Unlock /> : <Lock />}
              label={task.is_locked ? 'Unlock' : 'Lock'}
              onClick={() => handleAction(() => onLockToggle(task.id))}
            />
          )}

          {/* Move to Backlog */}
          {onMoveToBacklog && !task.completed && task.scheduled_time && (
            <ActionButton
              icon={<Inbox />}
              label="Backlog"
              onClick={() => handleAction(() => onMoveToBacklog(task.id))}
              variant="primary"
            />
          )}

          {/* Delete */}
          <ActionButton
            icon={<Trash2 />}
            label="Delete"
            onClick={handleDelete}
            variant="destructive"
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'success' | 'destructive';
}

function ActionButton({
  icon,
  label,
  onClick,
  variant = 'default',
}: ActionButtonProps) {
  const variantStyles = {
    default: 'bg-secondary text-foreground hover:bg-secondary/80',
    primary: 'bg-primary/10 text-primary hover:bg-primary/20',
    success: 'bg-success/10 text-success hover:bg-success/20',
    destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-colors',
        variantStyles[variant]
      )}
    >
      <span className="w-5 h-5 [&>svg]:w-full [&>svg]:h-full">{icon}</span>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
