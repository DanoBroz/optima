import type { CalendarEvent } from '@/types/task';
import { Calendar, MapPin, Zap, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getEventDrainMinutes, getEventEnergyLevel } from '@/utils/energy';
import { formatDuration } from '@/utils/time';

// Content visibility thresholds based on available height
const HEIGHT_THRESHOLDS = {
  minimal: 48,    // Just title + time
  compact: 64,    // + energy indicator
  normal: 80,     // + location
  expanded: 96,   // All content with comfortable spacing
};

interface EventCardProps {
  event: CalendarEvent;
  onClick?: () => void;
  onRestore?: () => void;
  /** Available height for the card (enables progressive collapse) */
  availableHeight?: number;
}

export function EventCard({ event, onClick, onRestore, availableHeight }: EventCardProps) {
  const startTime = format(new Date(event.start_time), 'h:mm a');
  const endTime = format(new Date(event.end_time), 'h:mm a');

  const isDismissed = event.is_dismissed;
  const energyLevel = getEventEnergyLevel(event);
  const drain = getEventDrainMinutes(event);

  // Determine content visibility based on available height
  const isHeightConstrained = availableHeight !== undefined;
  const showEnergyDrain = !isHeightConstrained || availableHeight >= HEIGHT_THRESHOLDS.compact;
  const showLocation = !isHeightConstrained || availableHeight >= HEIGHT_THRESHOLDS.normal;
  const showBadge = !isHeightConstrained || availableHeight >= HEIGHT_THRESHOLDS.expanded;
  const isMinimal = isHeightConstrained && availableHeight < HEIGHT_THRESHOLDS.compact;
  const isCompactHeight = isHeightConstrained && availableHeight < HEIGHT_THRESHOLDS.normal;
  const energyConfig = {
    restful: { emoji: '🌿', label: 'Restful', bg: 'bg-sky-100 dark:bg-sky-900/40', border: 'border-sky-200 dark:border-sky-700', accent: 'text-sky-700 dark:text-sky-300', title: 'text-sky-900 dark:text-sky-100' },
    low: { emoji: '🧘', label: 'Light', bg: 'bg-success/10', border: 'border-success/20', accent: 'text-success', title: 'text-foreground' },
    medium: { emoji: '💼', label: 'Normal', bg: 'bg-primary/10', border: 'border-primary/20', accent: 'text-primary', title: 'text-foreground' },
    high: { emoji: '🔥', label: 'Draining', bg: 'bg-destructive/10', border: 'border-destructive/20', accent: 'text-destructive', title: 'text-foreground' },
  };

  const config = energyConfig[energyLevel];

  const handleRestoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRestore?.();
  };

  // Adjust padding based on height constraint
  const paddingClass = isMinimal ? "p-2" : isCompactHeight ? "p-2.5" : "p-3";

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all",
        paddingClass,
        isDismissed
          ? "bg-secondary/30 border-border/30 opacity-50"
          : [config.bg, config.border],
        onClick && "cursor-pointer hover:shadow-card active:scale-[0.98]",
        isHeightConstrained && "h-full overflow-hidden"
      )}
      onClick={onClick}
    >
      <div className={cn(
        "flex items-start gap-2",
        isHeightConstrained && "h-full"
      )}>
        {/* Energy indicator bar - hidden when dismissed */}
        {!isDismissed && (
          <div className={cn(
            "flex-shrink-0 w-1.5 self-stretch rounded-full",
            energyLevel === 'high' ? "bg-destructive" : energyLevel === 'low' ? "bg-success" : energyLevel === 'restful' ? "bg-sky-500" : "bg-primary"
          )} />
        )}
        <div className="flex-1 min-w-0">
          {/* Header row with time and energy drain */}
          <div className={cn(
            "flex items-center justify-between gap-2",
            isMinimal ? "mb-0.5" : "mb-1.5"
          )}>
            <div className={cn(
              "flex items-center gap-1.5",
              isDismissed ? "text-muted-foreground" : config.accent
            )}>
              <Calendar className={isMinimal ? "w-3 h-3 flex-shrink-0" : "w-3.5 h-3.5 flex-shrink-0"} />
              <span className={cn(
                "font-semibold",
                isMinimal ? "text-[10px]" : "text-xs"
              )}>
                {startTime} - {endTime}
              </span>
            </div>
            {/* Energy drain - hidden when dismissed or minimal height */}
            {!isDismissed && showEnergyDrain && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className={isCompactHeight ? "text-xs" : "text-sm"}>{config.emoji}</span>
                <Zap className={isCompactHeight ? "w-2.5 h-2.5" : "w-3 h-3"} />
                <span className={cn(
                  "font-semibold",
                  isCompactHeight ? "text-[10px]" : "text-xs"
                )}>{formatDuration(drain)}</span>
              </div>
            )}
            {/* Restore button for dismissed events */}
            {isDismissed && onRestore && !isMinimal && (
              <button
                onClick={handleRestoreClick}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Restore
              </button>
            )}
          </div>
          {/* Title */}
          <p className={cn(
            "font-semibold",
            isMinimal ? "text-xs line-clamp-1" : "text-sm line-clamp-2",
            isDismissed ? "text-muted-foreground" : config.title
          )}>{event.title}</p>
          {/* Location - hidden when minimal or compact */}
          {showLocation && event.location && (
            <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs truncate font-medium">{event.location}</span>
            </div>
          )}
          {/* Badge: Skipped for dismissed, Synced for external - hidden when compact */}
          {showBadge && (isDismissed ? (
            <span className="inline-flex items-center px-2 py-0.5 mt-1.5 text-[10px] bg-secondary/50 rounded-full text-muted-foreground font-semibold">
              Skipped
            </span>
          ) : event.is_external && (
            <span className="inline-flex items-center px-2 py-0.5 mt-1.5 text-[10px] bg-secondary rounded-full text-muted-foreground font-semibold">
              Synced
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
