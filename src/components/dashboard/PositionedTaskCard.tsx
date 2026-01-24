import { useEffect, useRef } from 'react';
import type { Task } from '@/types/task';
import type { LayoutItem } from '@/utils/timelineLayout';
import { useDraggable } from '@dnd-kit/core';
import { TaskCard, type TaskCardActions, type TaskCardDraftState } from './TaskCard';
import { SwipeableTaskCard } from './SwipeableTaskCard';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useDashboardTaskActions } from '@/contexts/DashboardContext';

interface PositionedTaskCardProps {
  layout: LayoutItem;
  task: Task;
  /** Actions can be passed explicitly or obtained from DashboardContext */
  actions?: TaskCardActions;
  draftState?: TaskCardDraftState;
  onTap?: () => void;
  hideActions?: boolean;
  draggable?: boolean;
}

export function PositionedTaskCard({
  layout,
  task,
  actions: actionsProp,
  draftState = {},
  onTap,
  hideActions = false,
  draggable = false,
}: PositionedTaskCardProps) {
  const isMobile = useIsMobile();
  const { column, totalColumns, top, height } = layout;

  // Use context actions if not provided via props
  const contextActions = useDashboardTaskActions();
  const actions: TaskCardActions = actionsProp ?? {
    onToggle: contextActions.onToggle,
    onDelete: contextActions.onDelete,
    onDefer: contextActions.onDefer,
    onLockToggle: contextActions.onLockToggle,
    onMoveToBacklog: contextActions.onMoveToBacklog,
    onEdit: contextActions.onEdit,
  };

  // dnd-kit draggable hook
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: {
      cardTop: top, // Pass card top position for offset calculation
    },
    disabled: !draggable || isMobile,
  });

  // Track the visual position when drag ends to prevent any movement
  const dropPositionRef = useRef<number | null>(null);
  const previousTopRef = useRef(top);

  // When dragging, continuously track where we'd drop
  useEffect(() => {
    if (isDragging && transform) {
      dropPositionRef.current = top + transform.y;
    }
  }, [isDragging, transform, top]);

  // When top changes after a drop, clear the stored position
  useEffect(() => {
    if (dropPositionRef.current !== null && top !== previousTopRef.current) {
      // Position has updated, clear drop position
      dropPositionRef.current = null;
    }
    previousTopRef.current = top;
  }, [top]);

  // Calculate the transform needed to keep card visually stable
  let visualTransform: string | undefined;
  if (isDragging && transform) {
    // During drag: apply the drag transform
    visualTransform = `translate3d(0, ${transform.y}px, 0)`;
  } else if (dropPositionRef.current !== null) {
    // Just dropped: compensate to keep card at drop position
    const compensate = dropPositionRef.current - top;
    if (Math.abs(compensate) > 1) {
      visualTransform = `translate3d(0, ${compensate}px, 0)`;
    }
  }

  const style = {
    transform: visualTransform,
  };

  // Calculate width and position based on column assignment
  const widthPercent = 100 / totalColumns;
  const leftPercent = column * widthPercent;

  // Add small padding for visual spacing between cards
  const verticalPadding = 2;
  const innerHeight = height - verticalPadding * 2;

  // Width-constrained when sharing columns with other cards
  const isWidthConstrained = totalColumns > 1;

  return (
    <div
      ref={setNodeRef}
      className="absolute px-1"
      style={{
        top: `${top + verticalPadding}px`,
        height: `${innerHeight}px`,
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        cursor: draggable && !isMobile ? (isDragging ? 'grabbing' : 'grab') : undefined,
        zIndex: isDragging ? 50 : undefined,
        ...style,
      }}
      {...(draggable && !isMobile ? { ...listeners, ...attributes } : {})}
    >
      {isMobile ? (
        <SwipeableTaskCard
          task={task}
          actions={actions}
          display={{ compact: true, hideActions, availableHeight: innerHeight, isWidthConstrained }}
          draftState={draftState}
          onTap={onTap}
        />
      ) : (
        <TaskCard
          task={task}
          actions={actions}
          display={{ compact: true, hideActions, availableHeight: innerHeight, isWidthConstrained }}
          draftState={draftState}
        />
      )}
    </div>
  );
}
