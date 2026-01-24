import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { UserSettings } from '@/types/task';
import { getSettings, saveSettings } from '@/utils/settings';
import { TimePicker } from '@/components/ui/time-picker';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalBody,
  ResponsiveModalClose,
} from '@/components/ui/responsive-modal';

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

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<UserSettings>(getSettings);

  useEffect(() => {
    if (isOpen) {
      setSettings(getSettings());
    }
  }, [isOpen]);

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

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent>
        {/* Header */}
        <ResponsiveModalHeader className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <ResponsiveModalClose asChild>
            <button className="p-2 hover:bg-secondary rounded-xl transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </ResponsiveModalClose>
        </ResponsiveModalHeader>

        {/* Scrollable Body */}
        <ResponsiveModalBody>
          <div className="p-6 space-y-6">
            {/* Work Hours */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Work Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Start
                  </label>
                  <TimePicker
                    value={settings.work_start_time}
                    onChange={(time: string | undefined) =>
                      setSettings(prev => ({ ...prev, work_start_time: time || '09:00' }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    End
                  </label>
                  <TimePicker
                    value={settings.work_end_time}
                    onChange={(time: string | undefined) =>
                      setSettings(prev => ({ ...prev, work_end_time: time || '17:00' }))
                    }
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
                      <div className="flex-1">
                        <TimePicker
                          value={settings.availability_presets[preset].start}
                          onChange={(time) => updatePreset(preset, 'start', time || '09:00')}
                        />
                      </div>
                      <span className="text-muted-foreground text-sm">–</span>
                      <div className="flex-1">
                        <TimePicker
                          value={settings.availability_presets[preset].end}
                          onChange={(time) => updatePreset(preset, 'end', time || '17:00')}
                        />
                      </div>
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
        </ResponsiveModalBody>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
