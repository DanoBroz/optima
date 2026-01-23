import type { Task } from '@/types/task';
import type { TaskChangeType } from '@/hooks/useDraft';
import type { LayoutItem } from '@/utils/timelineLayout';
import { TaskCard } from './TaskCard';
import { SwipeableTaskCard } from './SwipeableTaskCard';
import { useIsMobile } from '@/hooks/useIsMobile';

interface PositionedTaskCardProps {
  layout: LayoutItem;
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDefer?: (id: string) => void;
  onLockToggle?: (id: string) => void;
  onMoveToBacklog?: (id: string) => void;
  onEdit?: (id: string) => void;
  onTap?: () => void;
  hideActions?: boolean;
  changeType?: TaskChangeType;
  originalTime?: string | null;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

export function PositionedTaskCard({
  layout,
  task,
  onToggle,
  onDelete,
  onDefer,
  onLockToggle,
  onMoveToBacklog,
  onEdit,
  onTap,
  hideActions = false,
  changeType,
  originalTime,
  draggable = false,
  onDragStart,
}: PositionedTaskCardProps) {
  const isMobile = useIsMobile();
  const { column, totalColumns, top, height } = layout;

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
      className="absolute px-1"
      style={{
        top: `${top + verticalPadding}px`,
        height: `${innerHeight}px`,
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
      }}
      draggable={draggable && !isMobile}
      onDragStart={draggable && onDragStart ? (e) => onDragStart(e, task.id) : undefined}
    >
      {isMobile ? (
        <SwipeableTaskCard
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          onDefer={onDefer}
          onLockToggle={onLockToggle}
          onMoveToBacklog={onMoveToBacklog}
          onEdit={onEdit}
          onTap={onTap}
          compact
          hideActions={hideActions}
          changeType={changeType}
          originalTime={originalTime}
          availableHeight={innerHeight}
          isWidthConstrained={isWidthConstrained}
        />
      ) : (
        <TaskCard
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          onDefer={onDefer}
          onLockToggle={onLockToggle}
          onMoveToBacklog={onMoveToBacklog}
          onEdit={onEdit}
          compact
          draggable={draggable}
          hideActions={hideActions}
          changeType={changeType}
          originalTime={originalTime}
          availableHeight={innerHeight}
          isWidthConstrained={isWidthConstrained}
        />
      )}
    </div>
  );
}
