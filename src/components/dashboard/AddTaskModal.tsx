import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Task, MotivationLevel, AvailabilityWindows } from '@/types/task';
import { cn } from '@/lib/utils';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  /** If provided, modal switches to edit mode with pre-filled form */
  editTask?: Task;
}

const motivationEmojis: Record<MotivationLevel, string> = {
  hate: '😫',
  dislike: '😕',
  neutral: '😐',
  like: '🙂',
  love: '😍'
};

const DRAG_THRESHOLD = 120;

export function AddTaskModal({ isOpen, onClose, onAdd, editTask }: AddTaskModalProps) {
  const isEditMode = !!editTask;

  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [motivation, setMotivation] = useState<MotivationLevel>('neutral');
  const [availabilityWindows, setAvailabilityWindows] = useState<AvailabilityWindows>([]);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const handleRef = useRef<HTMLDivElement>(null);

  // Pre-fill form when editing
  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setScheduledDate(editTask.scheduled_date || '');
      setTime(editTask.scheduled_time || '');
      setDuration(String(editTask.duration));
      setPriority(editTask.priority);
      setEnergyLevel(editTask.energy_level);
      setMotivation(editTask.motivation_level);
      setAvailabilityWindows(editTask.availability_windows || []);
    } else {
      // Reset form for add mode
      setTitle('');
      setScheduledDate('');
      setTime('');
      setDuration('30');
      setPriority('medium');
      setEnergyLevel('medium');
      setMotivation('neutral');
      setAvailabilityWindows([]);
    }
  }, [editTask]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      completed: editTask?.completed ?? false,
      scheduled_time: time || undefined,
      scheduled_date: scheduledDate || undefined,
      duration: parseInt(duration, 10),
      priority,
      energy_level: energyLevel,
      motivation_level: motivation,
      availability_windows: availabilityWindows,
      is_locked: editTask?.is_locked ?? !!time,
      order_index: editTask?.order_index ?? 0,
    });

    onClose();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    setIsDragging(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
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
            <h2 className="text-lg font-semibold">{isEditMode ? 'Edit Task' : 'New Task'}</h2>
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

            {/* Date, Time & Duration row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-3 bg-secondary rounded-xl border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-3 bg-secondary rounded-xl border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-3 bg-secondary rounded-xl border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
            </div>

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
                    {motivationEmojis[m]}
                  </button>
                ))}
              </div>
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
                        // If all three selected, reset to empty (any)
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
        </div>
      </div>
    </div>
  );
}
