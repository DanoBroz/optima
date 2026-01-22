import { useState, useCallback } from 'react';
import { Header } from '@/components/dashboard/Header';
import { TabBar } from '@/components/dashboard/TabBar';
import { AddTaskModal } from '@/components/dashboard/AddTaskModal';
import { AddEventModal } from '@/components/dashboard/AddEventModal';
import { SyncCalendarModal } from '@/components/dashboard/SyncCalendarModal';
import { SettingsModal } from '@/components/dashboard/SettingsModal';
import { DashboardPanels } from '@/components/dashboard/DashboardPanels';
import { PastTimeConflictModal, type PastTimeResolution } from '@/components/dashboard/PastTimeConflictModal';
import { NoSlotModal, type NoSlotResolution } from '@/components/dashboard/NoSlotModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTasks } from '@/hooks/useTasks';
import { useDraft } from '@/hooks/useDraft';
import { taskRepository } from '@/data/taskRepository';
import type { CalendarEvent, Task } from '@/types/task';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { scheduleService } from '@/services/scheduleService';

type TabType = 'timeline' | 'tasks' | 'all';

interface PendingTask {
  task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
  attemptedTime: string;
}

const Index = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [pendingTask, setPendingTask] = useState<PendingTask | null>(null);
  const [pendingUnscheduledTasks, setPendingUnscheduledTasks] = useState<Task[]>([]);
  const [pendingDateChange, setPendingDateChange] = useState<Date | null>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const {
    tasks,
    scheduledTasks,
    unscheduledTasks,
    events,
    dailyEnergy,
    dayIntention,
    isScheduling,
    capacity,
    actions,
  } = useTasks(selectedDate);

  const { task: taskActions, event: eventActions, energy: energyActions, intention: intentionActions, scheduling, refresh } = actions;

  // Apply draft changes to database
  const handleApplyDraft = useCallback(async (proposedTasks: Task[]) => {
    if (proposedTasks.length > 0) {
      await taskRepository.bulkUpdate(proposedTasks);
      await refresh.tasks();
      toast.success(`Applied ${proposedTasks.length} schedule changes`);
    }
  }, [refresh]);

  // Initialize draft hook
  const draft = useDraft({
    events,
    dailyEnergy: dailyEnergy?.energy_level || 'medium',
    dateStr,
    allTasks: tasks,
    onApply: handleApplyDraft,
  });

  // Handle scheduling an unscheduled task in draft mode
  const handleScheduleUnscheduledInDraft = useCallback((taskId: string, time: string) => {
    draft.scheduleUnscheduled(taskId, time);
  }, [draft]);

  // Handle scheduling task for tomorrow in draft mode
  const handleScheduleTomorrowInDraft = useCallback((taskId: string) => {
    const task = draft.draftState?.unscheduledTasks.find(t => t.id === taskId);
    if (!task) return;

    const tomorrowStr = format(addDays(selectedDate, 1), 'yyyy-MM-dd');
    const tomorrowSlot = scheduling.findNextSlotTomorrow(
      task.duration,
      task.availability_windows
    );

    if (tomorrowSlot) {
      // Remove from draft unscheduled and add to proposed with tomorrow's date
      // For now, we'll just defer it directly since it's going to tomorrow
      draft.scheduleUnscheduled(taskId, tomorrowSlot.time);
      // Update the proposed task to have tomorrow's date
      if (draft.draftState) {
        const updatedTask = draft.draftState.proposedTasks.find(t => t.id === taskId);
        if (updatedTask) {
          updatedTask.scheduled_date = tomorrowStr;
        }
      }
    } else {
      toast.info('No slot available tomorrow');
    }
  }, [draft, scheduling, selectedDate]);

  // Handle date change - show confirmation if draft is active
  const handleDateChange = useCallback((newDate: Date) => {
    if (draft.isActive) {
      setPendingDateChange(newDate); // Opens confirmation dialog
    } else {
      setSelectedDate(newDate);
    }
  }, [draft]);

  // Confirm date change and discard draft
  const handleConfirmDateChange = useCallback(() => {
    if (pendingDateChange) {
      draft.cancelDraft();
      setSelectedDate(pendingDateChange);
      setPendingDateChange(null);
    }
  }, [pendingDateChange, draft]);

  // Cancel date change
  const handleCancelDateChange = useCallback(() => {
    setPendingDateChange(null);
  }, []);

  const handleEventClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleEventModalClose = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  const handleDismissEvent = (id: string) => {
    eventActions.update(id, { is_dismissed: true });
  };

  const handleRestoreEvent = (id: string) => {
    eventActions.update(id, { is_dismissed: false });
  };

  const handleEditTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      setEditingTask(task);
      setIsTaskModalOpen(true);
    }
  };

  const handleTaskModalClose = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleAddTask = (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    // Handle edit mode
    if (editingTask) {
      taskActions.update(editingTask.id, task);
      handleTaskModalClose();
      return;
    }

    // Check if task has a time set and if it's in the past
    if (task.scheduled_time && scheduling.isTimeInPast(task.scheduled_time)) {
      setPendingTask({
        task,
        attemptedTime: task.scheduled_time,
      });
      return;
    }

    taskActions.add(task);
  };

  const handlePastTimeResolve = (resolution: PastTimeResolution) => {
    if (!pendingTask) return;

    const { task } = pendingTask;
    const today = format(selectedDate, 'yyyy-MM-dd');

    switch (resolution) {
      case 'auto_today': {
        // Find next available slot today
        const nextSlot = scheduling.findNextSlotToday(
          task.duration,
          task.availability_windows
        );
        if (nextSlot) {
          taskActions.add({
            ...task,
            scheduled_time: nextSlot,
            scheduled_date: today,
            is_locked: true,
          });
        } else {
          // No slot today, try tomorrow
          const tomorrowSlot = scheduling.findNextSlotTomorrow(
            task.duration,
            task.availability_windows
          );
          if (tomorrowSlot) {
            taskActions.add({
              ...task,
              scheduled_time: tomorrowSlot.time,
              scheduled_date: tomorrowSlot.date,
              is_locked: true,
            });
          } else {
            // No slots available, add to backlog
            taskActions.add({
              ...task,
              scheduled_time: undefined,
              scheduled_date: undefined,
              is_locked: false,
            });
          }
        }
        break;
      }
      case 'tomorrow': {
        const tomorrowStr = format(addDays(selectedDate, 1), 'yyyy-MM-dd');
        const tomorrowSlot = scheduling.findNextSlotTomorrow(
          task.duration,
          task.availability_windows
        );
        if (tomorrowSlot) {
          taskActions.add({
            ...task,
            scheduled_time: tomorrowSlot.time,
            scheduled_date: tomorrowSlot.date,
            is_locked: true,
          });
        } else {
          // No slot tomorrow, add with date but no time
          taskActions.add({
            ...task,
            scheduled_time: undefined,
            scheduled_date: tomorrowStr,
            is_locked: false,
          });
        }
        break;
      }
      case 'backlog':
        taskActions.add({
          ...task,
          scheduled_time: undefined,
          scheduled_date: undefined,
          is_locked: false,
        });
        break;
      case 'completed':
        taskActions.add({
          ...task,
          completed: true,
        });
        break;
    }

    setPendingTask(null);
  };

  const handleOptimizeSelected = async (selectedIds: string[]): Promise<{ scheduled: Task[]; unscheduled: Task[] }> => {
    // Calculate optimization without applying
    const tasksToOptimize = tasks.filter(
      t => selectedIds.includes(t.id) && !t.completed && !t.is_locked && !t.scheduled_time
    );

    if (tasksToOptimize.length === 0) {
      toast.info('No tasks to optimize');
      return { scheduled: [], unscheduled: [] };
    }

    // Run scheduling algorithm
    const scheduledTasks = scheduleService.autoScheduleSelected(
      tasks,
      selectedIds,
      events,
      dailyEnergy?.energy_level || 'medium',
      dateStr
    );

    const scheduledIds = new Set(scheduledTasks.map(t => t.id));
    const unscheduledTasks = tasksToOptimize.filter(t => !scheduledIds.has(t.id));

    // Check if there are any changes
    if (scheduledTasks.length === 0 && unscheduledTasks.length === 0) {
      toast.info('Already optimized!');
      return { scheduled: [], unscheduled: [] };
    }

    // Start draft mode
    const originalTasks = tasks.filter(t => selectedIds.includes(t.id));
    draft.startDraft(originalTasks, scheduledTasks, unscheduledTasks);

    return { scheduled: scheduledTasks, unscheduled: unscheduledTasks };
  };

  const handleOptimizeAll = async (): Promise<{ scheduled: Task[]; unscheduled: Task[] }> => {
    const backlogTasks = tasks.filter(
      task => !task.scheduled_time && !task.completed && !task.is_locked
    );

    if (backlogTasks.length === 0) {
      toast.info('No backlog tasks to schedule');
      return { scheduled: [], unscheduled: [] };
    }

    // Run scheduling algorithm
    const scheduledTasks = scheduleService.autoScheduleBacklog(
      tasks,
      events,
      dailyEnergy?.energy_level || 'medium',
      dateStr
    );

    const scheduledIds = new Set(scheduledTasks.map(t => t.id));
    const unscheduledTasks = backlogTasks.filter(t => !scheduledIds.has(t.id));

    // Check if there are any changes
    if (scheduledTasks.length === 0 && unscheduledTasks.length === 0) {
      toast.info('Already optimized!');
      return { scheduled: [], unscheduled: [] };
    }

    // Start draft mode
    draft.startDraft(backlogTasks, scheduledTasks, unscheduledTasks);

    return { scheduled: scheduledTasks, unscheduled: unscheduledTasks };
  };

  const handleNoSlotResolve = async (resolution: NoSlotResolution) => {
    if (pendingUnscheduledTasks.length === 0) return;

    switch (resolution) {
      case 'backlog':
        // Keep in backlog - nothing to do, just close modal
        break;
      case 'ignore_preset':
        await scheduling.scheduleIgnoringPreset(pendingUnscheduledTasks);
        break;
      case 'ignore_all':
        await scheduling.scheduleIgnoringAll(pendingUnscheduledTasks);
        break;
      case 'next_day':
        await scheduling.scheduleForNextDay(pendingUnscheduledTasks);
        break;
    }

    setPendingUnscheduledTasks([]);
  };

  const handleHeaderOptimize = async (): Promise<{ scheduled: Task[]; unscheduled: Task[] }> => {
    // Get all unlocked, incomplete tasks that could be (re)scheduled
    const tasksToOptimize = tasks.filter(task =>
      !task.is_locked &&
      !task.completed &&
      (!task.scheduled_time || task.scheduled_date === dateStr)
    );

    if (tasksToOptimize.length === 0) {
      toast.info('No tasks to optimize');
      return { scheduled: [], unscheduled: [] };
    }

    // Run scheduling algorithm
    const scheduledTasks = scheduleService.autoScheduleAllUnlocked(
      tasks,
      events,
      dailyEnergy?.energy_level || 'medium',
      dateStr
    );

    const scheduledIds = new Set(scheduledTasks.map(t => t.id));
    const unscheduledTasks = tasksToOptimize.filter(t => !scheduledIds.has(t.id));

    // Check if there are any meaningful changes
    const hasChanges = scheduledTasks.some(proposed => {
      const original = tasks.find(t => t.id === proposed.id);
      return !original || original.scheduled_time !== proposed.scheduled_time;
    });

    if (!hasChanges && unscheduledTasks.length === 0) {
      toast.info('Already optimized!');
      return { scheduled: [], unscheduled: [] };
    }

    // Start draft mode with all tasks that were considered for optimization
    draft.startDraft(tasksToOptimize, scheduledTasks, unscheduledTasks);

    return { scheduled: scheduledTasks, unscheduled: unscheduledTasks };
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        onAddTask={() => setIsTaskModalOpen(true)} 
        onAutoSchedule={handleHeaderOptimize}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isScheduling={isScheduling || draft.isProcessing}
      />

      <DashboardPanels
        activeTab={activeTab}
        scheduledTasks={draft.isActive && draft.draftState ? draft.draftState.proposedTasks : scheduledTasks}
        unscheduledTasks={unscheduledTasks}
        tasks={tasks}
        events={events}
        dailyEnergy={dailyEnergy}
        dayIntention={dayIntention}
        capacity={capacity}
        isScheduling={isScheduling || draft.isProcessing}
        onEventClick={handleEventClick}
        onRestoreEvent={handleRestoreEvent}
        onOpenEventModal={() => {
          setEditingEvent(null);
          setIsEventModalOpen(true);
        }}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        taskActions={{
          ...taskActions,
          autoScheduleSelected: handleOptimizeSelected,
          autoScheduleBacklog: handleOptimizeAll,
          reschedule: draft.isActive
            ? (id: string, time: string) => draft.updateProposedTime(id, time)
            : taskActions.reschedule,
          toggleLock: draft.isActive
            ? (id: string) => draft.toggleDraftLock(id)
            : taskActions.toggleLock,
          edit: handleEditTask,
        }}
        energyActions={energyActions}
        intentionActions={intentionActions}
        draftMode={draft.isActive ? {
          isActive: draft.isActive,
          changes: draft.draftState?.changes,
          ghostTasks: draft.ghostTasks,
          unscheduledTasks: draft.draftState?.unscheduledTasks,
          todayTasks: draft.todayTasks,
          tomorrowTasks: draft.tomorrowTasks,
          tomorrowDate: draft.tomorrowDateStr,
          currentDate: dateStr,
          changesSummary: draft.changesSummary,
          isProcessing: draft.isProcessing,
          onCancel: draft.cancelDraft,
          onReOptimize: draft.reOptimize,
          onApply: draft.applyDraft,
          onScheduleUnscheduled: handleScheduleUnscheduledInDraft,
          onScheduleTomorrow: handleScheduleTomorrowInDraft,
        } : undefined}
      />



      {/* Mobile tab bar */}
      <TabBar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onAddTask={() => setIsTaskModalOpen(true)}
        onAutoSchedule={handleHeaderOptimize}
        isScheduling={isScheduling || draft.isProcessing}
      />

      {/* Modals */}
      <AddTaskModal
        isOpen={isTaskModalOpen}
        onClose={handleTaskModalClose}
        onAdd={handleAddTask}
        editTask={editingTask ?? undefined}
      />
      <AddEventModal
        isOpen={isEventModalOpen}
        onClose={handleEventModalClose}
        onAdd={eventActions.add}
        onUpdate={eventActions.update}
        onDelete={eventActions.remove}
        onDismiss={handleDismissEvent}
        selectedDate={selectedDate}
        editEvent={editingEvent}
      />
      <SyncCalendarModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onImport={eventActions.import}
        onClearSyncedEvents={eventActions.clearExternal}
        selectedDate={selectedDate}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      <PastTimeConflictModal
        isOpen={pendingTask !== null}
        onClose={() => setPendingTask(null)}
        onResolve={handlePastTimeResolve}
        taskTitle={pendingTask?.task.title ?? ''}
        attemptedTime={pendingTask?.attemptedTime ?? ''}
      />
      <NoSlotModal
        isOpen={pendingUnscheduledTasks.length > 0}
        onClose={() => setPendingUnscheduledTasks([])}
        onResolve={handleNoSlotResolve}
        unscheduledCount={pendingUnscheduledTasks.length}
      />

      {/* Discard draft confirmation dialog */}
      <AlertDialog open={pendingDateChange !== null} onOpenChange={(open) => !open && handleCancelDateChange()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard optimization changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved optimization changes. Changing the date will discard these changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDateChange}>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDateChange}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
