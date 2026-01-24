/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { X, Zap, Trash2, EyeOff, ChevronDown } from 'lucide-react';
import type { Task, CalendarEvent, MotivationLevel, AvailabilityWindows } from '@/types/task';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { DurationPicker } from '@/components/ui/duration-picker';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalBody,
  ResponsiveModalClose,
} from '@/components/ui/responsive-modal';

export type AddModalTab = 'task' | 'event';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Task callbacks
  onAddTask: (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  editTask?: Task | null;

  // Event callbacks
  onAddEvent: (event: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onUpdateEvent?: (id: string, updates: Partial<CalendarEvent>) => void;
  onDeleteEvent?: (id: string) => void;
  onDismissEvent?: (id: string) => void;
  editEvent?: CalendarEvent | null;

  // Shared
  selectedDate: Date;
  initialTab?: AddModalTab;
}

const motivationEmojis: Record<MotivationLevel, string> = {
  hate: '😫',
  dislike: '😕',
  neutral: '😐',
  like: '🙂',
  love: '😍'
};

const energyOptions: { level: 'restful' | 'low' | 'medium' | 'high'; emoji: string; label: string; description: string }[] = [
  { level: 'restful', emoji: '🌿', label: 'Restful', description: 'Recharging, restorative' },
  { level: 'low', emoji: '🧘', label: 'Light', description: 'Relaxing, recovery' },
  { level: 'medium', emoji: '💼', label: 'Normal', description: 'Regular activity' },
  { level: 'high', emoji: '🔥', label: 'Draining', description: 'Intense, exhausting' },
];

const drainMultipliers: Record<'restful' | 'low' | 'medium' | 'high', number> = {
  restful: 0,
  low: 0.5,
  medium: 1.0,
  high: 1.5,
};

export function AddModal({
  isOpen,
  onClose,
  onAddTask,
  editTask,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onDismissEvent,
  editEvent,
  selectedDate,
  initialTab = 'task'
}: AddModalProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<AddModalTab>(initialTab);

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskScheduledDate, setTaskScheduledDate] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [taskDuration, setTaskDuration] = useState(30);
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskEnergyLevel, setTaskEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskMotivation, setTaskMotivation] = useState<MotivationLevel>('neutral');
  const [taskAvailabilityWindows, setTaskAvailabilityWindows] = useState<AvailabilityWindows>([]);
  const [moodSettingsExpanded, setMoodSettingsExpanded] = useState(false);

  // Event form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndTime, setEventEndTime] = useState('10:00');
  const [eventLocation, setEventLocation] = useState('');
  const [eventEnergyLevel, setEventEnergyLevel] = useState<'restful' | 'low' | 'medium' | 'high'>('medium');
  const [eventUseCustomDrain, setEventUseCustomDrain] = useState(false);
  const [eventCustomDrain, setEventCustomDrain] = useState(60);

  // Determine edit mode
  const isTaskEditMode = !!editTask;
  const isEventEditMode = !!editEvent;
  const isEditMode = isTaskEditMode || isEventEditMode;
  const isExternalEvent = editEvent?.is_external ?? false;
  const isDismissedEvent = editEvent?.is_dismissed ?? false;
  const isFieldDisabled = isExternalEvent || isDismissedEvent;
  const isEnergyDisabled = isDismissedEvent;

  // Reset tab based on initialTab when modal opens
  useEffect(() => {
    if (isOpen && !isEditMode) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab, isEditMode]);

  // Pre-fill task form when editing
  useEffect(() => {
    if (editTask) {
      setTaskTitle(editTask.title);
      setTaskScheduledDate(editTask.scheduled_date || '');
      setTaskTime(editTask.scheduled_time || '');
      setTaskDuration(editTask.duration);
      setTaskPriority(editTask.priority);
      setTaskEnergyLevel(editTask.energy_level);
      setTaskMotivation(editTask.motivation_level);
      setTaskAvailabilityWindows(editTask.availability_windows || []);
      setActiveTab('task');
    }
  }, [editTask]);

  // Pre-fill event form when editing
  useEffect(() => {
    if (editEvent) {
      setEventTitle(editEvent.title);
      const startDate = new Date(editEvent.start_time);
      const endDate = new Date(editEvent.end_time);
      setEventStartTime(format(startDate, 'HH:mm'));
      setEventEndTime(format(endDate, 'HH:mm'));
      setEventLocation(editEvent.location || '');
      setEventEnergyLevel(editEvent.energy_level || 'medium');
      setEventUseCustomDrain(editEvent.energy_drain !== undefined && editEvent.energy_drain !== null);
      setEventCustomDrain(editEvent.energy_drain || 60);
      setActiveTab('event');
    }
  }, [editEvent]);

  // Reset forms when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset task form
      setTaskTitle('');
      setTaskScheduledDate('');
      setTaskTime('');
      setTaskDuration(30);
      setTaskPriority('medium');
      setTaskEnergyLevel('medium');
      setTaskMotivation('neutral');
      setTaskAvailabilityWindows([]);
      // Reset event form
      setEventTitle('');
      setEventStartTime('09:00');
      setEventEndTime('10:00');
      setEventLocation('');
      setEventEnergyLevel('medium');
      setEventUseCustomDrain(false);
      setEventCustomDrain(60);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetTaskForm = () => {
    setTaskTitle('');
    setTaskScheduledDate('');
    setTaskTime('');
    setTaskDuration(30);
    setTaskPriority('medium');
    setTaskEnergyLevel('medium');
    setTaskMotivation('neutral');
    setTaskAvailabilityWindows([]);
  };

  const resetEventForm = () => {
    setEventTitle('');
    setEventStartTime('09:00');
    setEventEndTime('10:00');
    setEventLocation('');
    setEventEnergyLevel('medium');
    setEventUseCustomDrain(false);
    setEventCustomDrain(60);
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    onAddTask({
      title: taskTitle.trim(),
      completed: editTask?.completed ?? false,
      scheduled_time: taskTime || undefined,
      scheduled_date: taskScheduledDate || undefined,
      duration: taskDuration,
      priority: taskPriority,
      energy_level: taskEnergyLevel,
      motivation_level: taskMotivation,
      availability_windows: taskAvailabilityWindows,
      is_locked: editTask?.is_locked ?? !!taskTime,
      order_index: editTask?.order_index ?? 0,
    });

    resetTaskForm();
    onClose();
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    if (isDismissedEvent) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    if (isEventEditMode && editEvent && onUpdateEvent) {
      if (isExternalEvent) {
        onUpdateEvent(editEvent.id, {
          start_time: `${dateStr}T${eventStartTime}:00Z`,
          end_time: `${dateStr}T${eventEndTime}:00Z`,
          energy_level: eventEnergyLevel,
          energy_drain: eventUseCustomDrain ? eventCustomDrain : undefined
        });
      } else {
        onUpdateEvent(editEvent.id, {
          title: eventTitle.trim(),
          start_time: `${dateStr}T${eventStartTime}:00Z`,
          end_time: `${dateStr}T${eventEndTime}:00Z`,
          location: eventLocation || undefined,
          energy_level: eventEnergyLevel,
          energy_drain: eventUseCustomDrain ? eventCustomDrain : undefined
        });
      }
    } else {
      onAddEvent({
        title: eventTitle.trim(),
        start_time: `${dateStr}T${eventStartTime}:00Z`,
        end_time: `${dateStr}T${eventEndTime}:00Z`,
        is_external: false,
        location: eventLocation || undefined,
        energy_level: eventEnergyLevel,
        energy_drain: eventUseCustomDrain ? eventCustomDrain : undefined
      });
    }

    resetEventForm();
    onClose();
  };

  const handleDeleteEvent = () => {
    if (editEvent && onDeleteEvent) {
      onDeleteEvent(editEvent.id);
      onClose();
    }
  };

  const handleDismissEvent = () => {
    if (editEvent && onDismissEvent) {
      onDismissEvent(editEvent.id);
      onClose();
    }
  };

  // Calculate event energy drain
  const [startH, startM] = eventStartTime.split(':').map(Number);
  const [endH, endM] = eventEndTime.split(':').map(Number);
  const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  const calculatedDrain = eventUseCustomDrain
    ? eventCustomDrain
    : Math.round(durationMinutes * drainMultipliers[eventEnergyLevel]);

  const formatDrain = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Determine header title
  const getHeaderTitle = () => {
    if (isTaskEditMode) return 'Edit Task';
    if (isDismissedEvent) return 'Skipped Event';
    if (isExternalEvent) return 'Edit Synced Event';
    if (isEventEditMode) return 'Edit Event';
    return null; // Will show tabs instead
  };

  const headerTitle = getHeaderTitle();

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent>
        {/* Header */}
        <ResponsiveModalHeader className="flex items-center justify-between">
          {headerTitle ? (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{headerTitle}</h2>
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
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AddModalTab)}>
              <TabsList className="h-9 p-1 bg-secondary/50 rounded-xl">
                <TabsTrigger value="task" className="rounded-lg px-4 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  Task
                </TabsTrigger>
                <TabsTrigger value="event" className="rounded-lg px-4 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  Event
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <ResponsiveModalClose asChild>
            <button className="p-2 hover:bg-secondary rounded-xl transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </ResponsiveModalClose>
        </ResponsiveModalHeader>

        {/* Scrollable Body */}
        <ResponsiveModalBody>
          {/* Task Form */}
          {activeTab === 'task' && (
            <form onSubmit={handleTaskSubmit} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Task name
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full px-4 py-3 bg-secondary rounded-xl border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  autoFocus
                />
              </div>

              {/* Date, Time & Duration row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Date
                  </label>
                  <DatePicker
                    value={taskScheduledDate || undefined}
                    onChange={(date: string | undefined) => setTaskScheduledDate(date || '')}
                    placeholder="Select date"
                    clearable
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Time
                  </label>
                  <TimePicker
                    value={taskTime || undefined}
                    onChange={(time: string | undefined) => setTaskTime(time || '')}
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
                  value={taskDuration}
                  onChange={setTaskDuration}
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
                            onClick={() => setTaskPriority(p.value)}
                            className={cn(
                              "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5",
                              taskPriority === p.value
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
                            onClick={() => setTaskEnergyLevel(e)}
                            className={cn(
                              "flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all",
                              taskEnergyLevel === e
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
                            onClick={() => setTaskMotivation(m)}
                            className={cn(
                              "flex-1 py-2.5 rounded-xl text-lg transition-all",
                              taskMotivation === m
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
                    const isSelected = taskAvailabilityWindows.includes(window);
                    return (
                      <button
                        key={window}
                        type="button"
                        onClick={() => {
                          const newWindows = isSelected
                            ? taskAvailabilityWindows.filter(w => w !== window)
                            : [...taskAvailabilityWindows, window];
                          if (newWindows.length === 3) {
                            setTaskAvailabilityWindows([]);
                          } else {
                            setTaskAvailabilityWindows(newWindows as AvailabilityWindows);
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
                {taskAvailabilityWindows.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5">Any time (no restriction)</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!taskTitle.trim()}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-card active:scale-[0.98]"
              >
                {isTaskEditMode ? 'Save Changes' : 'Add Task'}
              </button>
            </form>
          )}

          {/* Event Form */}
          {activeTab === 'event' && (
            <form onSubmit={handleEventSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Event name
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
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
                  <TimePicker
                    value={eventStartTime}
                    onChange={(time: string | undefined) => setEventStartTime(time || '09:00')}
                    disabled={isFieldDisabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    End time
                  </label>
                  <TimePicker
                    value={eventEndTime}
                    onChange={(time: string | undefined) => setEventEndTime(time || '10:00')}
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
                        onClick={() => {
                          const [sH, sM] = eventStartTime.split(':').map(Number);
                          const [eH, eM] = eventEndTime.split(':').map(Number);
                          const newStartH = Math.max(0, Math.min(23, sH + h));
                          const newEndH = Math.max(0, Math.min(23, eH + h));
                          setEventStartTime(`${String(newStartH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`);
                          setEventEndTime(`${String(newEndH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`);
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                      >
                        {h > 0 ? `+${h}h` : `${h}h`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
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
                  {energyOptions.map(({ level, emoji, label, description }) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => !isEnergyDisabled && setEventEnergyLevel(level)}
                      disabled={isEnergyDisabled}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-xl transition-all",
                        eventEnergyLevel === level
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
                        checked={eventUseCustomDrain}
                        onChange={(e) => setEventUseCustomDrain(e.target.checked)}
                        className="rounded border-border"
                      />
                      Override with custom drain
                    </label>

                    {eventUseCustomDrain && (
                      <div className="mt-2">
                        <input
                          type="range"
                          min="0"
                          max="240"
                          step="15"
                          value={eventCustomDrain}
                          onChange={(e) => setEventCustomDrain(Number(e.target.value))}
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
                {isEventEditMode && !isDismissedEvent && onDeleteEvent && (
                  <button
                    type="button"
                    onClick={handleDeleteEvent}
                    className="py-3.5 px-5 bg-destructive/10 text-destructive rounded-xl font-semibold transition-all hover:bg-destructive/20 active:scale-[0.98] flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isExternalEvent ? 'Remove' : 'Delete'}
                  </button>
                )}

                {isEventEditMode && isExternalEvent && !isDismissedEvent && onDismissEvent && (
                  <button
                    type="button"
                    onClick={handleDismissEvent}
                    className="py-3.5 px-5 bg-secondary text-muted-foreground rounded-xl font-semibold transition-all hover:bg-secondary/80 active:scale-[0.98] flex items-center gap-2"
                  >
                    <EyeOff className="w-4 h-4" />
                    Skip
                  </button>
                )}

                {!isDismissedEvent && (
                  <button
                    type="submit"
                    disabled={!eventTitle.trim()}
                    className="flex-1 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-card active:scale-[0.98]"
                  >
                    {isEventEditMode ? 'Save Changes' : 'Add Event'}
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
          )}
        </ResponsiveModalBody>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
