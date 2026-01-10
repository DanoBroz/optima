import type { CalendarEvent } from '@/types/task';
import { Calendar, MapPin, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: CalendarEvent;
}

const energyConfig: Record<string, { emoji: string; label: string; color: string }> = {
  low: { emoji: '🧘', label: 'Light', color: 'text-success' },
  medium: { emoji: '💼', label: 'Normal', color: 'text-primary' },
  high: { emoji: '🔥', label: 'Draining', color: 'text-destructive' },
};

export function EventCard({ event }: EventCardProps) {
  const startTime = format(new Date(event.start_time), 'h:mm a');
  const endTime = format(new Date(event.end_time), 'h:mm a');
  
  // Calculate duration
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const durationMinutes = (end.getTime() - start.getTime()) / 60000;
  
  // Calculate drain based on energy level
  const drainMultipliers = { low: 0.5, medium: 1.0, high: 1.5 };
  const energyLevel = (event.energy_level || 'medium') as 'low' | 'medium' | 'high';
  const drain = event.energy_drain ?? Math.round(durationMinutes * drainMultipliers[energyLevel]);
  
  const config = energyConfig[energyLevel];
  
  const formatDrain = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };
  
  return (
    <div className={cn(
      "rounded-xl p-3 border",
      energyLevel === 'high' 
        ? "bg-destructive/10 border-destructive/20" 
        : energyLevel === 'low'
        ? "bg-success/10 border-success/20"
        : "bg-primary/10 border-primary/20"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex-shrink-0 w-1 h-full rounded-full",
          energyLevel === 'high' ? "bg-destructive" : energyLevel === 'low' ? "bg-success" : "bg-primary"
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className={cn(
              "flex items-center gap-2",
              energyLevel === 'high' ? "text-destructive" : energyLevel === 'low' ? "text-success" : "text-primary"
            )}>
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-medium">
                {startTime} - {endTime}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="text-sm">{config.emoji}</span>
              <Zap className="w-3 h-3" />
              <span className="text-xs font-medium">{formatDrain(drain)}</span>
            </div>
          </div>
          <p className="font-medium text-sm truncate">{event.title}</p>
          {event.location && (
            <div className="flex items-center gap-1 mt-1 text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs truncate">{event.location}</span>
            </div>
          )}
          {event.is_external && (
            <span className="inline-flex items-center px-1.5 py-0.5 mt-1 text-[10px] bg-secondary rounded text-muted-foreground">
              Synced
            </span>
          )}
        </div>
      </div>
    </div>
  );
}