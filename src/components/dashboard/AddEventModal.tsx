/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { X, Zap, Trash2, EyeOff } from 'lucide-react';
import type { CalendarEvent } from '@/types/task';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (event: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onUpdate?: (id: string, updates: Partial<CalendarEvent>) => void;
  onDelete?: (id: string) => void;
  onDismiss?: (id: string) => void;
  selectedDate: Date;
  editEvent?: CalendarEvent | null;
}

const energyOptions: { level: 'low' | 'medium' | 'high'; emoji: string; label: string; description: string }[] = [
  { level: 'low', emoji: '🧘', label: 'Light', description: 'Relaxing, recovery' },
  { level: 'medium', emoji: '💼', label: 'Normal', description: 'Regular activity' },
  { level: 'high', emoji: '🔥', label: 'Draining', description: 'Intense, exhausting' },
];

const drainMultipliers: Record<'low' | 'medium' | 'high', number> = {
  low: 0.5,    // Light events drain 50% of their duration
  medium: 1.0, // Normal events drain 100% of their duration
  high: 1.5,   // Draining events drain 150% of their duration
};

const DRAG_THRESHOLD = 120;

export function AddEventModal({ isOpen, onClose, onAdd, onUpdate, onDelete, onDismiss, selectedDate, editEvent }: AddEventModalProps) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [useCustomDrain, setUseCustomDrain] = useState(false);
  const [customDrain, setCustomDrain] = useState(60);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const handleRef = useRef<HTMLDivElement>(null);

  const isEditMode = !!editEvent;
  const isExternalEvent = editEvent?.is_external ?? false;
  const isDismissedEvent = editEvent?.is_dismissed ?? false;
  
  // External events: only energy settings are editable
  // Dismissed events: everything is read-only
  const isFieldDisabled = isExternalEvent || isDismissedEvent;
  const isEnergyDisabled = isDismissedEvent;

  // Pre-populate form when editing
  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      const startDate = new Date(editEvent.start_time);
      const endDate = new Date(editEvent.end_time);
      setStartTime(format(startDate, 'HH:mm'));
      setEndTime(format(endDate, 'HH:mm'));
      setLocation(editEvent.location || '');
      setEnergyLevel(editEvent.energy_level || 'medium');
      setUseCustomDrain(editEvent.energy_drain !== undefined && editEvent.energy_drain !== null);
      setCustomDrain(editEvent.energy_drain || 60);
    } else {
      setTitle('');
      setStartTime('09:00');
      setEndTime('10:00');
      setLocation('');
      setEnergyLevel('medium');
      setUseCustomDrain(false);
      setCustomDrain(60);
    }
  }, [editEvent]);

  // Track pointer on window for reliable drag
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      const delta = Math.max(0, e.clientY - dragStartY.current);
      setDragY(delta);
    };

    const handlePointerUp = () => {
      if (dragY > DRAG_THRESHOLD) {
        onClose();
      }
      setDragY(0);
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, dragY, onClose]);

  if (!isOpen) return null;

  // Calculate event duration in minutes
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  
  // Calculate energy drain
  const calculatedDrain = useCustomDrain 
    ? customDrain 
    : Math.round(durationMinutes * drainMultipliers[energyLevel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    // Dismissed events can't be saved (read-only mode)
    if (isDismissedEvent) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    if (isEditMode && editEvent && onUpdate) {
      if (isExternalEvent) {
        // External events: only update energy settings
        onUpdate(editEvent.id, {
          energy_level: energyLevel,
          energy_drain: useCustomDrain ? customDrain : undefined
        });
      } else {
        // Manual events: update all fields
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
      onAdd({
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

  const formatDrain = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    setIsDragging(true);
  };

  // Determine modal title
  const getModalTitle = () => {
    if (isDismissedEvent) return 'Skipped Event';
    if (isExternalEvent) return 'Edit Synced Event';
    if (isEditMode) return 'Edit Event';
    return 'Add Event';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-elevated animate-slide-up max-h-[80vh] flex flex-col"
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {/* Fixed Header Area */}
        <div className="flex-shrink-0">
          {/* Handle bar */}
          <div
            ref={handleRef}
            className="flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing select-none hover:bg-secondary/40 transition-colors rounded-t-3xl sm:rounded-t-2xl"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
          >
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/40 sm:w-8 sm:h-1" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{getModalTitle()}</h2>
              {isExternalEvent && !isDismissedEvent && (
                <span className="px-2 py-0.5 text-[10px] bg-secondary rounded-full text-muted-foreground font-semibold">
                  Synced
                </span>
              )}
              {isDismissedEvent && (
                <span className="px-2 py-0.5 text-[10px] bg-secondary/50 rounded-full text-muted-foreground font-semibold">
                  Skipped
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Start time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isFieldDisabled}
                  className={cn(
                    "w-full px-4 py-3 bg-secondary rounded-xl border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all",
                    isFieldDisabled && "opacity-60 cursor-not-allowed"
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  End time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={isFieldDisabled}
                  className={cn(
                    "w-full px-4 py-3 bg-secondary rounded-xl border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all",
                    isFieldDisabled && "opacity-60 cursor-not-allowed"
                  )}
                />
              </div>
            </div>

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
              <div className="grid grid-cols-3 gap-2">
                {energyOptions.map(({ level, emoji, label, description }) => (
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
              {/* Delete button for manual events only */}
              {isEditMode && !isExternalEvent && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="py-3.5 px-5 bg-destructive/10 text-destructive rounded-xl font-semibold transition-all hover:bg-destructive/20 active:scale-[0.98] flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
              
              {/* Dismiss button for external (synced) events that are not already dismissed */}
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
              
              {/* Save/Add button - hidden for dismissed events (they are read-only) */}
              {!isDismissedEvent && (
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="flex-1 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-card active:scale-[0.98]"
                >
                  {isEditMode ? 'Save Changes' : 'Add Event'}
                </button>
              )}
              
              {/* Close button for dismissed events (read-only mode) */}
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
        </div>
      </div>
    </div>
  );
}
