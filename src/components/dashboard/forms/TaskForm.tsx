/**
 * Task creation/editing form component.
 * Handles task-specific state and form UI.
 */
import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Task, MotivationLevel, AvailabilityWindows } from '@/types/task';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { DurationPicker } from '@/components/ui/duration-picker';
import { MOTIVATION_EMOJIS } from '@/config/energy';

interface TaskFormProps {
  /** Task being edited (null for new task) */
  editTask?: Task | null;
  /** Called when form is submitted */
  onSubmit: (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  /** Called when form should close */
  onClose: () => void;
  /** Whether modal is open (for reset logic) */
  isOpen: boolean;
}

export function TaskForm({ editTask, onSubmit, onClose, isOpen }: TaskFormProps) {
  const isEditMode = !!editTask;

  // Form state
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [motivation, setMotivation] = useState<MotivationLevel>('neutral');
  const [availabilityWindows, setAvailabilityWindows] = useState<AvailabilityWindows>([]);
  const [moodSettingsExpanded, setMoodSettingsExpanded] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setScheduledDate(editTask.scheduled_date || '');
      setTime(editTask.scheduled_time || '');
      setDuration(editTask.duration);
      setPriority(editTask.priority);
      setEnergyLevel(editTask.energy_level);
      setMotivation(editTask.motivation_level);
      setAvailabilityWindows(editTask.availability_windows || []);
    }
  }, [editTask]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setScheduledDate('');
      setTime('');
      setDuration(30);
      setPriority('medium');
      setEnergyLevel('medium');
      setMotivation('neutral');
      setAvailabilityWindows([]);
      setMoodSettingsExpanded(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      completed: editTask?.completed ?? false,
      scheduled_time: time || undefined,
      scheduled_date: scheduledDate || undefined,
      duration,
      priority,
      energy_level: energyLevel,
      motivation_level: motivation,
      availability_windows: availabilityWindows,
      is_locked: editTask?.is_locked ?? !!time,
      order_index: editTask?.order_index ?? 0,
    });

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Task name
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="w-full px-4 py-3 bg-secondary rounded-xl border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          autoFocus
        />
      </div>

      {/* Date, Time row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Date
          </label>
          <DatePicker
            value={scheduledDate || undefined}
            onChange={(date: string | undefined) => setScheduledDate(date || '')}
            placeholder="Select date"
            clearable
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Time
          </label>
          <TimePicker
            value={time || undefined}
            onChange={(t: string | undefined) => setTime(t || '')}
            placeholder="Select time"
            clearable
          />
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Duration
        </label>
        <DurationPicker
          value={duration}
          onChange={setDuration}
        />
      </div>

      {/* Mood Settings Toggle */}
      <div className="border border-border/50 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setMoodSettingsExpanded(!moodSettingsExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors"
        >
          <span className="text-sm font-medium text-muted-foreground">Mood Settings</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              moodSettingsExpanded && "rotate-180"
            )}
          />
        </button>

        {moodSettingsExpanded && (
          <div className="p-4 space-y-5 border-t border-border/50">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Priority
              </label>
              <div className="flex gap-2">
                {([
                  { value: 'low', marks: '!', label: 'Low' },
                  { value: 'medium', marks: '!!', label: 'Medium' },
                  { value: 'high', marks: '!!!', label: 'High' },
                ] as const).map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5",
                      priority === p.value
                        ? p.value === 'high'
                          ? "bg-destructive/15 text-destructive ring-2 ring-destructive/30"
                          : p.value === 'medium'
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/30"
                          : "bg-secondary text-secondary-foreground ring-2 ring-border"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <span className="font-bold">{p.marks}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Energy Level */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Focus Required
              </label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEnergyLevel(e)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all",
                      energyLevel === e
                        ? "bg-accent text-accent-foreground ring-2 ring-primary/30"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Motivation Level */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                How do you feel about this task?
              </label>
              <div className="flex gap-2">
                {(['hate', 'dislike', 'neutral', 'like', 'love'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivation(m)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-lg transition-all",
                      motivation === m
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/50 scale-110"
                        : "bg-secondary/50 hover:bg-secondary grayscale hover:grayscale-0"
                    )}
                    title={m}
                  >
                    {MOTIVATION_EMOJIS[m]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Availability Window */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Available time windows
        </label>
        <div className="flex gap-2">
          {(['morning', 'afternoon', 'evening'] as const).map((window) => {
            const isSelected = availabilityWindows.includes(window);
            return (
              <button
                key={window}
                type="button"
                onClick={() => {
                  const newWindows = isSelected
                    ? availabilityWindows.filter(w => w !== window)
                    : [...availabilityWindows, window];
                  if (newWindows.length === 3) {
                    setAvailabilityWindows([]);
                  } else {
                    setAvailabilityWindows(newWindows as AvailabilityWindows);
                  }
                }}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all",
                  isSelected
                    ? "bg-accent text-accent-foreground ring-2 ring-primary/30"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                )}
              >
                {window}
              </button>
            );
          })}
        </div>
        {availabilityWindows.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1.5">Any time (no restriction)</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!title.trim()}
        className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-card active:scale-[0.98]"
      >
        {isEditMode ? 'Save Changes' : 'Add Task'}
      </button>
    </form>
  );
}
