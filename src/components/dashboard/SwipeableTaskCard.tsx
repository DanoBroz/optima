import { useRef, useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { Check, Inbox, Trash2, Undo2 } from 'lucide-react';
import type { Task } from '@/types/task';
import type { TaskChangeType } from '@/hooks/useDraft';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

interface SwipeableTaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDefer?: (id: string) => void;
  onLockToggle?: (id: string) => void;
  onMoveToBacklog?: (id: string) => void;
  onEdit?: (id: string) => void;
  onTap?: () => void;
  compact?: boolean;
  showCompletionToggle?: boolean;
  hideActions?: boolean;
  changeType?: TaskChangeType;
  originalTime?: string | null;
}

const SWIPE_THRESHOLD = 0.35; // 35% of card width
const REVEAL_WIDTH = 140; // Width to reveal action buttons (px)

export function SwipeableTaskCard({
  task,
  onToggle,
  onDelete,
  onMoveToBacklog,
  onTap,
  compact = false,
  showCompletionToggle = true,
  hideActions = false,
  changeType,
  originalTime,
  ...restProps
}: SwipeableTaskCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleComplete = () => {
    // Animate card off screen, then toggle
    setOffsetX(window.innerWidth);
    setTimeout(() => {
      onToggle(task.id);
      setOffsetX(0);
    }, 200);
  };

  const handleMoveToBacklog = () => {
    if (onMoveToBacklog) {
      onMoveToBacklog(task.id);
    }
    snapBack();
  };

  const handleDelete = () => {
    const taskTitle = task.title;
    onDelete(task.id);
    snapBack();

    // Show undo toast
    toast('Task deleted', {
      description: taskTitle,
      action: {
        label: 'Undo',
        onClick: () => {
          // Note: Undo would require parent to implement restore logic
          toast('Undo not available yet');
        },
      },
      duration: 5000,
    });
  };

  const snapBack = () => {
    setOffsetX(0);
    setIsRevealed(false);
  };

  const bind = useDrag(
    ({ movement: [mx], velocity: [vx], direction: [dx], active, tap }) => {
      // Handle tap
      if (tap && !isRevealed) {
        onTap?.();
        return;
      }

      // Close revealed actions on tap
      if (tap && isRevealed) {
        snapBack();
        return;
      }

      setIsDragging(active);

      const containerWidth = containerRef.current?.offsetWidth ?? 300;
      const threshold = containerWidth * SWIPE_THRESHOLD;

      if (active) {
        // While dragging, update position
        // Limit left swipe to reveal width, allow right swipe freely
        const clampedX = Math.max(-REVEAL_WIDTH, mx);
        setOffsetX(clampedX);
      } else {
        // On release
        const fastSwipe = Math.abs(vx) > 0.5;

        if (mx > threshold || (fastSwipe && dx > 0 && mx > 50)) {
          // Swipe right → complete/uncomplete
          handleComplete();
        } else if (mx < -threshold || (fastSwipe && dx < 0 && mx < -50)) {
          // Swipe left past threshold → reveal action buttons
          setOffsetX(-REVEAL_WIDTH);
          setIsRevealed(true);
        } else {
          // Below threshold → snap back
          snapBack();
        }
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true },
    }
  );

  // Calculate background colors based on swipe direction
  const showRightAction = offsetX > 20;
  const showLeftActions = offsetX < -20;

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl">
      {/* Right swipe background - Complete action */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 flex items-center justify-start pl-4 transition-opacity",
          task.completed ? "bg-amber-500" : "bg-success",
          showRightAction ? "opacity-100" : "opacity-0"
        )}
        style={{ width: Math.max(offsetX, 0) }}
      >
        {task.completed ? (
          <Undo2 className="w-6 h-6 text-white" />
        ) : (
          <Check className="w-6 h-6 text-white" strokeWidth={3} />
        )}
      </div>

      {/* Left swipe background - Action buttons */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex items-center gap-1 pr-2 transition-opacity",
          showLeftActions ? "opacity-100" : "opacity-0"
        )}
        style={{ width: REVEAL_WIDTH }}
      >
        {/* Move to Backlog button - larger */}
        {onMoveToBacklog && task.scheduled_time && !task.completed && (
          <button
            onClick={handleMoveToBacklog}
            className="flex-1 h-full flex flex-col items-center justify-center bg-primary rounded-xl text-primary-foreground"
          >
            <Inbox className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-1">Backlog</span>
          </button>
        )}

        {/* Delete button - smaller, square */}
        <button
          onClick={handleDelete}
          className="h-full aspect-square flex items-center justify-center bg-destructive rounded-xl text-destructive-foreground"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Card content - slides with gesture */}
      <div
        {...bind()}
        className={cn(
          "relative touch-pan-y",
          isDragging ? "" : "transition-transform duration-200 ease-out"
        )}
        style={{ transform: `translateX(${offsetX}px)` }}
      >
        <TaskCard
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          compact={compact}
          showCompletionToggle={showCompletionToggle}
          hideActions={hideActions || true} // Always hide hover actions on mobile
          changeType={changeType}
          originalTime={originalTime}
          {...restProps}
        />
      </div>
    </div>
  );
}
