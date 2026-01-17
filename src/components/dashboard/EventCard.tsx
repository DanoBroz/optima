import type { CalendarEvent } from '@/types/task';
import { Calendar, MapPin, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getEventDrainMinutes, getEventEnergyLevel } from '@/utils/energy';
import { formatDuration } from '@/utils/time';

interface EventCardProps {
  event: CalendarEvent;
  onClick?: () => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
  const startTime = format(new Date(event.start_time), 'h:mm a');
  const endTime = format(new Date(event.end_time), 'h:mm a');

  const energyLevel = getEventEnergyLevel(event);
  const drain = getEventDrainMinutes(event);
  const energyConfig = {
    low: { emoji: '🧘', label: 'Light', bg: 'bg-success/10', border: 'border-success/20', accent: 'text-success' },
    medium: { emoji: '💼', label: 'Normal', bg: 'bg-primary/10', border: 'border-primary/20', accent: 'text-primary' },
    high: { emoji: '🔥', label: 'Draining', bg: 'bg-destructive/10', border: 'border-destructive/20', accent: 'text-destructive' },
  };

  const config = energyConfig[energyLevel];

  return (
    <div
      className={cn(
        "rounded-2xl p-3 border transition-all",
        config.bg,
        config.border,
        onClick && !event.is_external && "cursor-pointer hover:shadow-card active:scale-[0.98]"
      )}
      onClick={onClick && !event.is_external ? onClick : undefined}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex-shrink-0 w-1.5 self-stretch rounded-full",
          energyLevel === 'high' ? "bg-destructive" : energyLevel === 'low' ? "bg-success" : "bg-primary"
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className={cn("flex items-center gap-2", config.accent)}>
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-semibold">
                {startTime} - {endTime}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-sm">{config.emoji}</span>
              <Zap className="w-3 h-3" />
              <span className="text-xs font-semibold">{formatDuration(drain)}</span>
            </div>
          </div>
          <p className="font-semibold text-sm truncate">{event.title}</p>
          {event.location && (
            <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs truncate font-medium">{event.location}</span>
            </div>
          )}
          {event.is_external && (
            <span className="inline-flex items-center px-2 py-0.5 mt-1.5 text-[10px] bg-secondary rounded-full text-muted-foreground font-semibold">
              Synced
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
