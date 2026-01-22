import type { CalendarEvent } from '@/types/task';
import { Calendar, MapPin, Zap, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getEventDrainMinutes, getEventEnergyLevel } from '@/utils/energy';
import { formatDuration } from '@/utils/time';

interface EventCardProps {
  event: CalendarEvent;
  onClick?: () => void;
  onRestore?: () => void;
}

export function EventCard({ event, onClick, onRestore }: EventCardProps) {
  const startTime = format(new Date(event.start_time), 'h:mm a');
  const endTime = format(new Date(event.end_time), 'h:mm a');

  const isDismissed = event.is_dismissed;
  const energyLevel = getEventEnergyLevel(event);
  const drain = getEventDrainMinutes(event);
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

  return (
    <div
      className={cn(
        "rounded-2xl p-3 border transition-all",
        isDismissed 
          ? "bg-secondary/30 border-border/30 opacity-50" 
          : [config.bg, config.border],
        onClick && "cursor-pointer hover:shadow-card active:scale-[0.98]"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Energy indicator bar - hidden when dismissed */}
        {!isDismissed && (
          <div className={cn(
            "flex-shrink-0 w-1.5 self-stretch rounded-full",
            energyLevel === 'high' ? "bg-destructive" : energyLevel === 'low' ? "bg-success" : energyLevel === 'restful' ? "bg-sky-500" : "bg-primary"
          )} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className={cn(
              "flex items-center gap-2",
              isDismissed ? "text-muted-foreground" : config.accent
            )}>
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-semibold">
                {startTime} - {endTime}
              </span>
            </div>
            {/* Energy drain - hidden when dismissed */}
            {!isDismissed && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="text-sm">{config.emoji}</span>
                <Zap className="w-3 h-3" />
                <span className="text-xs font-semibold">{formatDuration(drain)}</span>
              </div>
            )}
            {/* Restore button for dismissed events */}
            {isDismissed && onRestore && (
              <button
                onClick={handleRestoreClick}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Restore
              </button>
            )}
          </div>
          <p className={cn(
            "font-semibold text-sm truncate",
            isDismissed ? "text-muted-foreground" : config.title
          )}>{event.title}</p>
          {event.location && (
            <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs truncate font-medium">{event.location}</span>
            </div>
          )}
          {/* Badge: Skipped for dismissed, Synced for external */}
          {isDismissed ? (
            <span className="inline-flex items-center px-2 py-0.5 mt-1.5 text-[10px] bg-secondary/50 rounded-full text-muted-foreground font-semibold">
              Skipped
            </span>
          ) : event.is_external && (
            <span className="inline-flex items-center px-2 py-0.5 mt-1.5 text-[10px] bg-secondary rounded-full text-muted-foreground font-semibold">
              Synced
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
