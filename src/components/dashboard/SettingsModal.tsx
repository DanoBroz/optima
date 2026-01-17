import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { UserSettings } from '@/types/task';
import { getSettings, saveSettings } from '@/utils/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
} as const;

const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => i); // 0-12
const MINUTE_OPTIONS = [0, 15, 30, 45];

const DRAG_THRESHOLD = 120;

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<UserSettings>(getSettings);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(getSettings());
      setDragY(0);
    }
  }, [isOpen]);

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

  const handleSave = () => {
    saveSettings(settings);
    onClose();
  };

  const updatePreset = (
    preset: 'morning' | 'afternoon' | 'evening',
    field: 'start' | 'end',
    value: string
  ) => {
    setSettings(prev => ({
      ...prev,
      availability_presets: {
        ...prev.availability_presets,
        [preset]: {
          ...prev.availability_presets[preset],
          [field]: value,
        },
      },
    }));
  };

  const capacityHours = Math.floor(settings.daily_capacity_minutes / 60);
  const capacityMinutes = settings.daily_capacity_minutes % 60;

  const updateCapacity = (hours: number, minutes: number) => {
    setSettings(prev => ({
      ...prev,
      daily_capacity_minutes: hours * 60 + minutes,
    }));
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
            <h2 className="text-lg font-semibold">Settings</h2>
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
          <div className="p-6 space-y-6">
            {/* Work Hours */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Work Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Start
                  </label>
                  <input
                    type="time"
                    value={settings.work_start_time}
                    onChange={(e) =>
                      setSettings(prev => ({ ...prev, work_start_time: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 bg-secondary rounded-xl border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    End
                  </label>
                  <input
                    type="time"
                    value={settings.work_end_time}
                    onChange={(e) =>
                      setSettings(prev => ({ ...prev, work_end_time: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 bg-secondary rounded-xl border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Availability Presets */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Availability Presets
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Define time windows for scheduling tasks. Tasks with a preset will only be auto-scheduled within their window.
              </p>
              <div className="space-y-3">
                {(Object.keys(PRESET_LABELS) as Array<keyof typeof PRESET_LABELS>).map(
                  preset => (
                    <div key={preset} className="flex items-center gap-3">
                      <span className="w-20 text-sm font-medium text-muted-foreground capitalize">
                        {PRESET_LABELS[preset]}
                      </span>
                      <input
                        type="time"
                        value={settings.availability_presets[preset].start}
                        onChange={(e) => updatePreset(preset, 'start', e.target.value)}
                        className="flex-1 px-3 py-2 bg-secondary rounded-xl border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                      <span className="text-muted-foreground text-sm">–</span>
                      <input
                        type="time"
                        value={settings.availability_presets[preset].end}
                        onChange={(e) => updatePreset(preset, 'end', e.target.value)}
                        className="flex-1 px-3 py-2 bg-secondary rounded-xl border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Daily Capacity */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Daily Capacity</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Maximum focused work time per day
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Hours
                  </label>
                  <select
                    value={capacityHours}
                    onChange={(e) => updateCapacity(parseInt(e.target.value, 10), capacityMinutes)}
                    className="w-full px-3 py-2.5 bg-secondary rounded-xl border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
                  >
                    {HOUR_OPTIONS.map(h => (
                      <option key={h} value={h}>{h}h</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Minutes
                  </label>
                  <select
                    value={capacityMinutes}
                    onChange={(e) => updateCapacity(capacityHours, parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2.5 bg-secondary rounded-xl border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
                  >
                    {MINUTE_OPTIONS.map(m => (
                      <option key={m} value={m}>{m}m</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold transition-all hover:shadow-card active:scale-[0.98]"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
