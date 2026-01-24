import type { CalendarEvent } from '@/types/task';
import type { LayoutItem } from '@/utils/timelineLayout';
import { EventCard } from './EventCard';
import { useDashboardEventActions } from '@/contexts/DashboardContext';

interface PositionedEventCardProps {
  layout: LayoutItem;
  event: CalendarEvent;
  /** Event actions can be passed explicitly or obtained from DashboardContext */
  onClick?: () => void;
  onRestore?: () => void;
}

export function PositionedEventCard({
  layout,
  event,
  onClick: onClickProp,
  onRestore: onRestoreProp,
}: PositionedEventCardProps) {
  const { column, totalColumns, top, height } = layout;

  // Use context actions if not provided via props
  const contextActions = useDashboardEventActions();
  const onClick = onClickProp ?? (() => contextActions.onClick(event));
  const onRestore = onRestoreProp ?? (() => contextActions.onRestore(event.id));

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
