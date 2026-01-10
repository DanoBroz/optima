import { useState } from 'react';
import { X } from 'lucide-react';
import type { Task, MotivationLevel } from '@/types/task';
import { cn } from '@/lib/utils';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
}

const motivationEmojis: Record<MotivationLevel, string> = {
  hate: '😫',
  dislike: '😕',
  neutral: '😐',
  like: '🙂',
  love: '😍'
};

export function AddTaskModal({ isOpen, onClose, onAdd }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [motivation, setMotivation] = useState<MotivationLevel>('neutral');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      completed: false,
      scheduled_time: time || undefined,
      scheduled_date: time ? new Date().toISOString().split('T')[0] : undefined,
      duration: parseInt(duration, 10),
      priority,
      energy_level: energyLevel,
      motivation_level: motivation,
      is_locked: !!time,
      order_index: 0
    });

    setTitle('');
    setTime('');
    setDuration('30');
    setPriority('medium');
    setEnergyLevel('medium');
    setMotivation('neutral');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-elevated animate-slide-up">
        {/* Handle bar (mobile) */}
        <div className="sm:hidden flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <h2 className="text-lg font-semibold">New Task</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
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

          {/* Time & Duration row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Time (optional)
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 bg-secondary rounded-xl border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-secondary rounded-xl border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
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
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all",
                    priority === p
                      ? p === 'high'
                        ? "bg-primary text-primary-foreground"
                        : p === 'medium'
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-secondary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {p}
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

          {/* Submit */}
          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-card active:scale-[0.98]"
          >
            Add Task
          </button>
        </form>
      </div>
    </div>
  );
}
