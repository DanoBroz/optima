/**
 * Event creation/editing form component.
 * Handles event-specific state, external event handling, and form UI.
 */
import { useState, useEffect } from 'react';
import { Zap, Trash2, EyeOff } from 'lucide-react';
import type { CalendarEvent } from '@/types/task';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TimePicker } from '@/components/ui/time-picker';
import { EVENT_ENERGY_OPTIONS, EVENT_ENERGY_CONFIG } from '@/config/energy';

type EventEnergyLevel = 'restful' | 'low' | 'medium' | 'high';

interface EventFormProps {
  /** Event being edited (null for new event) */
  editEvent?: CalendarEvent | null;
  /** Selected date for new events */
  selectedDate: Date;
  /** Called when form is submitted with new event data */
  onSubmit: (event: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  /** Called when existing event should be updated */
  onUpdate?: (id: string, updates: Partial<CalendarEvent>) => void;
  /** Called when event should be deleted */
  onDelete?: (id: string) => void;
  /** Called when external event should be dismissed/skipped */
  onDismiss?: (id: string) => void;
  /** Called when form should close */
  onClose: () => void;
  /** Whether modal is open (for reset logic) */
  isOpen: boolean;
}

export function EventForm({
  editEvent,
  selectedDate,
  onSubmit,
  onUpdate,
  onDelete,
  onDismiss,
  onClose,
  isOpen,
}: EventFormProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [energyLevel, setEnergyLevel] = useState<EventEnergyLevel>('medium');
  const [useCustomDrain, setUseCustomDrain] = useState(false);
  const [customDrain, setCustomDrain] = useState(60);

  // Derived state
  const isEditMode = !!editEvent;
  const isExternalEvent = editEvent?.is_external ?? false;
  const isDismissedEvent = editEvent?.is_dismissed ?? false;
  const isFieldDisabled = isExternalEvent || isDismissedEvent;
  const isEnergyDisabled = isDismissedEvent;

  // Pre-fill form when editing
  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      const startDate = new Date(editEvent.start_time);
      const endDate = new Date(editEvent.end_time);
      // Use UTC methods to match the Z suffix used when saving
      const startHours = startDate.getUTCHours().toString().padStart(2, '0');
      const startMinutes = startDate.getUTCMinutes().toString().padStart(2, '0');
      const endHours = endDate.getUTCHours().toString().padStart(2, '0');
      const endMinutes = endDate.getUTCMinutes().toString().padStart(2, '0');
      setStartTime(`${startHours}:${startMinutes}`);
      setEndTime(`${endHours}:${endMinutes}`);
      setLocation(editEvent.location || '');
      setEnergyLevel(editEvent.energy_level || 'medium');
      setUseCustomDrain(editEvent.energy_drain !== undefined && editEvent.energy_drain !== null);
      setCustomDrain(editEvent.energy_drain || 60);
    }
  }, [editEvent]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setStartTime('09:00');
      setEndTime('10:00');
      setLocation('');
      setEnergyLevel('medium');
      setUseCustomDrain(false);
      setCustomDrain(60);
    }
  }, [isOpen]);

  // Calculate energy drain
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  const calculatedDrain = useCustomDrain
    ? customDrain
    : Math.round(durationMinutes * EVENT_ENERGY_CONFIG[energyLevel].drainMultiplier);

  const formatDrain = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (isDismissedEvent) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    if (isEditMode && editEvent && onUpdate) {
      if (isExternalEvent) {
        // For external events, only update time and energy settings
        onUpdate(editEvent.id, {
          start_time: `${dateStr}T${startTime}:00Z`,
          end_time: `${dateStr}T${endTime}:00Z`,
          energy_level: energyLevel,
          energy_drain: useCustomDrain ? customDrain : undefined
        });
      } else {
        // For regular events, update everything
        onUpdate(editEvent.id, {
          title: title.trim(),
          start_time: `${dateStr}T${startTime}:00Z`,
          end_time: `${dateStr}T${endTime}:00Z`,
          location: location || undefined,
          energy_level: energyLevel,
          energy_drain: useCustomDrain ? customDrain : undefined
        });
      }
    } else {
      // Create new event
      onSubmit({
        title: title.trim(),
        start_time: `${dateStr}T${startTime}:00Z`,
        end_time: `${dateStr}T${endTime}:00Z`,
        is_external: false,
        location: location || undefined,
        energy_level: energyLevel,
        energy_drain: useCustomDrain ? customDrain : undefined
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (editEvent && onDelete) {
      onDelete(editEvent.id);
      onClose();
    }
  };

  const handleDismiss = () => {
    if (editEvent && onDismiss) {
      onDismiss(editEvent.id);
      onClose();
    }
  };

  const adjustTime = (hoursOffset: number) => {
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const newStartH = Math.max(0, Math.min(23, sH + hoursOffset));
    const newEndH = Math.max(0, Math.min(23, eH + hoursOffset));
    setStartTime(`${String(newStartH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`);
    setEndTime(`${String(newEndH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Event name
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Meeting, appointment..."
          disabled={isFieldDisabled}
          className={cn(
            "w-full px-4 py-3 bg-secondary rounded-xl border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all",
            isFieldDisabled && "opacity-60 cursor-not-allowed"
          )}
          autoFocus={!isFieldDisabled}
        />
      </div>

      {/* Time pickers */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Start time
          </label>
          <TimePicker
            value={startTime}
            onChange={(time: string | undefined) => setStartTime(time || '09:00')}
            disabled={isFieldDisabled}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            End time
          </label>
          <TimePicker
            value={endTime}
            onChange={(time: string | undefined) => setEndTime(time || '10:00')}
            disabled={isFieldDisabled}
          />
        </div>
      </div>

      {/* Time adjustment for synced events */}
      {isExternalEvent && !isDismissedEvent && (
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
          <span className="text-sm text-muted-foreground">Adjust time:</span>
          <div className="flex items-center gap-2">
            {[-1, 1].map(h => (
              <button
                key={h}
                type="button"
                onClick={() => adjustTime(h)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
              >
                {h > 0 ? `+${h}h` : `${h}h`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Location (optional)
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Room, address, or link"
          disabled={isFieldDisabled}
          className={cn(
            "w-full px-4 py-3 bg-secondary rounded-xl border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all",
            isFieldDisabled && "opacity-60 cursor-not-allowed"
          )}
        />
      </div>

      {/* Energy Level */}
      <div className={cn(isEnergyDisabled && "opacity-60")}>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          How draining is this event?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {EVENT_ENERGY_OPTIONS.map(({ level, emoji, label, description }) => (
            <button
              key={level}
              type="button"
              onClick={() => !isEnergyDisabled && setEnergyLevel(level)}
              disabled={isEnergyDisabled}
              className={cn(
                "flex flex-col items-center p-3 rounded-xl transition-all",
                energyLevel === level
                  ? "bg-primary/10 ring-2 ring-primary/50"
                  : "bg-secondary/50 hover:bg-secondary",
                isEnergyDisabled && "cursor-not-allowed"
              )}
            >
              <span className="text-xl mb-1">{emoji}</span>
              <span className="text-xs font-medium">{label}</span>
              <span className="text-[10px] text-muted-foreground">{description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Energy Drain Preview */}
      <div className={cn("bg-secondary/50 rounded-xl p-3", isEnergyDisabled && "opacity-60")}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Capacity drain</span>
          </div>
          <span className="text-sm font-bold text-primary">
            {isDismissedEvent ? '0m' : formatDrain(calculatedDrain)}
          </span>
        </div>

        {!isEnergyDisabled && (
          <>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={useCustomDrain}
                onChange={(e) => setUseCustomDrain(e.target.checked)}
                className="rounded border-border"
              />
              Override with custom drain
            </label>

            {useCustomDrain && (
              <div className="mt-2">
                <input
                  type="range"
                  min="0"
                  max="240"
                  step="15"
                  value={customDrain}
                  onChange={(e) => setCustomDrain(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0m</span>
                  <span>4h</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {isEditMode && !isDismissedEvent && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="py-3.5 px-5 bg-destructive/10 text-destructive rounded-xl font-semibold transition-all hover:bg-destructive/20 active:scale-[0.98] flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {isExternalEvent ? 'Remove' : 'Delete'}
          </button>
        )}

        {isEditMode && isExternalEvent && !isDismissedEvent && onDismiss && (
          <button
            type="button"
            onClick={handleDismiss}
            className="py-3.5 px-5 bg-secondary text-muted-foreground rounded-xl font-semibold transition-all hover:bg-secondary/80 active:scale-[0.98] flex items-center gap-2"
          >
            <EyeOff className="w-4 h-4" />
            Skip
          </button>
        )}

        {!isDismissedEvent && (
          <button
            type="submit"
            disabled={!title.trim()}
            className="flex-1 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-card active:scale-[0.98]"
          >
            {isEditMode ? 'Save Changes' : 'Add Event'}
          </button>
        )}

        {isDismissedEvent && (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 bg-secondary text-foreground rounded-xl font-semibold transition-all hover:bg-secondary/80 active:scale-[0.98]"
          >
            Close
          </button>
        )}
      </div>
    </form>
  );
}
