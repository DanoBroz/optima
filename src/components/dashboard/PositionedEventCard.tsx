import type { CalendarEvent } from '@/types/task';
import type { LayoutItem } from '@/utils/timelineLayout';
import { EventCard } from './EventCard';

interface PositionedEventCardProps {
  layout: LayoutItem;
  event: CalendarEvent;
  onClick?: () => void;
  onRestore?: () => void;
}

export function PositionedEventCard({
  layout,
  event,
  onClick,
  onRestore,
}: PositionedEventCardProps) {
  const { column, totalColumns, top, height } = layout;

  // Calculate width and position based on column assignment
  const widthPercent = 100 / totalColumns;
  const leftPercent = column * widthPercent;

  // Add small padding for visual spacing between cards
  const verticalPadding = 2;
  const innerHeight = height - verticalPadding * 2;

  return (
    <div
      className="absolute px-1"
      style={{
        top: `${top + verticalPadding}px`,
        height: `${innerHeight}px`,
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
      }}
    >
      <EventCard
        event={event}
        onClick={onClick}
        onRestore={onRestore}
        availableHeight={innerHeight}
      />
    </div>
  );
}
