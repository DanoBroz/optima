/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { X, Zap, Trash2 } from 'lucide-react';
import type { CalendarEvent } from '@/types/task';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (event: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onUpdate?: (id: string, updates: Partial<CalendarEvent>) => void;
  onDelete?: (id: string) => void;
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

export function AddEventModal({ isOpen, onClose, onAdd, onUpdate, onDelete, selectedDate, editEvent }: AddEventModalProps) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [useCustomDrain, setUseCustomDrain] = useState(false);
  const [customDrain, setCustomDrain] = useState(60);

  const isEditMode = !!editEvent;

  // Pre-populate form when editing
  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      // Extract time from ISO string (e.g., "2024-01-15T09:00:00Z" -> "09:00")
      const startDate = new Date(editEvent.start_time);
      const endDate = new Date(editEvent.end_time);
      setStartTime(format(startDate, 'HH:mm'));
      setEndTime(format(endDate, 'HH:mm'));
      setLocation(editEvent.location || '');
      setEnergyLevel(editEvent.energy_level || 'medium');
      setUseCustomDrain(editEvent.energy_drain !== undefined && editEvent.energy_drain !== null);
      setCustomDrain(editEvent.energy_drain || 60);
    } else {
      // Reset form for add mode
      setTitle('');
      setStartTime('09:00');
      setEndTime('10:00');
      setLocation('');
      setEnergyLevel('medium');
      setUseCustomDrain(false);
      setCustomDrain(60);
    }
  }, [editEvent]);

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

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    if (isEditMode && editEvent && onUpdate) {
      onUpdate(editEvent.id, {
        title: title.trim(),
        start_time: `${dateStr}T${startTime}:00Z`,
        end_time: `${dateStr}T${endTime}:00Z`,
        location: location || undefined,
        energy_level: energyLevel,
        energy_drain: useCustomDrain ? customDrain : undefined
      });
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

  const formatDrain = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-elevated animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="sm:hidden flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <h2 className="text-lg font-semibold">{isEditMode ? 'Edit Event' : 'Add Event'}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

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
              className="w-full px-4 py-3 bg-secondary rounded-xl border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              autoFocus
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
                className="w-full px-4 py-3 bg-secondary rounded-xl border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
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
                className="w-full px-4 py-3 bg-secondary rounded-xl border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
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
              className="w-full px-4 py-3 bg-secondary rounded-xl border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          {/* Energy Level */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              How draining is this event?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {energyOptions.map(({ level, emoji, label, description }) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEnergyLevel(level)}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-xl transition-all",
                    energyLevel === level
                      ? "bg-primary/10 ring-2 ring-primary/50"
                      : "bg-secondary/50 hover:bg-secondary"
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
          <div className="bg-secondary/50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Capacity drain</span>
              </div>
              <span className="text-sm font-bold text-primary">
                {formatDrain(calculatedDrain)}
              </span>
            </div>
            
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
          </div>

          <div className="flex gap-3">
            {isEditMode && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="py-3.5 px-5 bg-destructive/10 text-destructive rounded-xl font-semibold transition-all hover:bg-destructive/20 active:scale-[0.98] flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-card active:scale-[0.98]"
            >
              {isEditMode ? 'Save Changes' : 'Add Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}