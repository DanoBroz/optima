import { useState, useCallback, lazy, Suspense } from 'react';
import { Header } from '@/components/dashboard/Header';
import { TabBar } from '@/components/dashboard/TabBar';
import { DraftActionBar } from '@/components/dashboard/DraftActionBar';
import { SettingsModal } from '@/components/dashboard/SettingsModal';

// Lazy load modals for code splitting
const AddModal = lazy(() => import('@/components/dashboard/AddModal').then(m => ({ default: m.AddModal })));
const SyncCalendarModal = lazy(() => import('@/components/dashboard/SyncCalendarModal').then(m => ({ default: m.SyncCalendarModal })));
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
import { useModalOrchestration } from '@/hooks/useModalOrchestration';
import { taskRepository } from '@/data/taskRepository';
import type { Task } from '@/types/task';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { scheduleService } from '@/services/scheduleService';

type TabType = 'timeline' | 'today' | 'backlog';

const Index = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<TabType>('timeline');

  // Modal orchestration (extracted for cleaner state management)
  const { modals, editing, pending, actions: modalActions } = useModalOrchestration();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const {
    tasks,
    scheduledTasks,
    unscheduledTasks,
    todayBacklogTasks,
    trueUnscheduledTasks,
    deferredTasks,
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
      modalActions.setPendingDateChange(newDate); // Opens confirmation dialog
    } else {
      setSelectedDate(newDate);
    }
  }, [draft, modalActions]);

  // Confirm date change and discard draft
  const handleConfirmDateChange = useCallback(() => {
    if (pending.dateChange) {
      draft.cancelDraft();
      setSelectedDate(pending.dateChange);
      modalActions.setPendingDateChange(null);
    }
  }, [pending.dateChange, draft, modalActions]);

  // Cancel date change
  const handleCancelDateChange = useCallback(() => {
    modalActions.setPendingDateChange(null);
  }, [modalActions]);

  // Event handlers using modal orchestration
  const handleEventClick = modalActions.openEditEvent;

  const handleDismissEvent = (id: string) => {
    eventActions.update(id, { is_dismissed: true });
  };

  const handleRestoreEvent = (id: string) => {
    eventActions.update(id, { is_dismissed: false });
  };

  const handleEditTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      modalActions.openEditTask(task);
    }
  };

  const handleAddTask = (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    // Handle edit mode
    if (editing.task) {
      taskActions.update(editing.task.id, task);
      modalActions.closeAddModal();
      return;
    }

    // Check if task has a time set and if it's in the past
    if (task.scheduled_time && scheduling.isTimeInPast(task.scheduled_time)) {
      modalActions.setPendingTask({
        task,
        attemptedTime: task.scheduled_time,
      });
      return;
    }

    taskActions.add(task);
  };

  const handlePastTimeResolve = (resolution: PastTimeResolution) => {
    if (!pending.task) return;

    const { task } = pending.task;
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

    modalActions.setPendingTask(null);
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
    // Only include tasks for today or with no date (exclude future-dated tasks)
    const backlogTasks = tasks.filter(
      task => !task.scheduled_time &&
              !task.completed &&
              !task.is_locked &&
              (!task.scheduled_date || task.scheduled_date === dateStr)
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
    if (pending.unscheduledTasks.length === 0) return;

    switch (resolution) {
      case 'backlog':
        // Keep in backlog - nothing to do, just close modal
        break;
      case 'ignore_preset':
        await scheduling.scheduleIgnoringPreset(pending.unscheduledTasks);
        break;
      case 'ignore_all':
        await scheduling.scheduleIgnoringAll(pending.unscheduledTasks);
        break;
      case 'next_day':
        await scheduling.scheduleForNextDay(pending.unscheduledTasks);
        break;
    }

    modalActions.setPendingUnscheduledTasks([]);
  };

  const handleHeaderOptimize = async (): Promise<{ scheduled: Task[]; unscheduled: Task[] }> => {
    // Only reschedule unlocked tasks already on today's timeline
    // Does NOT pull from backlog - for that use "Optimize All" in backlog panel
    const tasksToOptimize = tasks.filter(task =>
      !task.is_locked &&
      !task.completed &&
      task.scheduled_date === dateStr &&
      task.scheduled_time  // Must have a time (already on timeline)
    );

    if (tasksToOptimize.length === 0) {
      toast.info('No unlocked tasks on timeline to reschedule');
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
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-background flex flex-col">
      <Header
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        onAddTask={() => modalActions.openAddModal('task')}
        onAutoSchedule={handleHeaderOptimize}
        onOpenSettings={modalActions.openSettingsModal}
        isScheduling={isScheduling || draft.isProcessing}
      />

      <DashboardPanels
        activeTab={activeTab}
        scheduledTasks={draft.isActive && draft.draftState ? draft.draftState.proposedTasks : scheduledTasks}
        unscheduledTasks={unscheduledTasks}
        todayBacklogTasks={todayBacklogTasks}
        trueUnscheduledTasks={trueUnscheduledTasks}
        deferredTasks={deferredTasks}
        tasks={tasks}
        events={events}
        dailyEnergy={dailyEnergy}
        dayIntention={dayIntention}
        capacity={capacity}
        isScheduling={isScheduling || draft.isProcessing}
        onEventClick={handleEventClick}
        onRestoreEvent={handleRestoreEvent}
        onOpenSyncModal={modalActions.openSyncModal}
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



      {/* Mobile bottom bar - show DraftActionBar during draft mode, TabBar otherwise */}
      {draft.isActive ? (
        <DraftActionBar
          onCancel={draft.cancelDraft}
          onApply={draft.applyDraft}
          isProcessing={draft.isProcessing}
          hasChanges={draft.changesSummary.moved > 0 || draft.changesSummary.new > 0}
          changesSummary={draft.changesSummary}
        />
      ) : (
        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddTask={() => modalActions.openAddModal('task')}
          onAutoSchedule={handleHeaderOptimize}
          isScheduling={isScheduling || draft.isProcessing}
        />
      )}

      {/* Lazy-loaded modals for code splitting */}
      <Suspense fallback={null}>
        {modals.isAddModalOpen && (
          <AddModal
            key={`${editing.task?.id ?? ''}-${editing.event?.id ?? ''}-${modals.addModalInitialTab}`}
            isOpen={modals.isAddModalOpen}
            onClose={modalActions.closeAddModal}
            onAddTask={handleAddTask}
            editTask={editing.task}
            onAddEvent={eventActions.add}
            onUpdateEvent={eventActions.update}
            onDeleteEvent={eventActions.remove}
            onDismissEvent={handleDismissEvent}
            editEvent={editing.event}
            selectedDate={selectedDate}
            initialTab={modals.addModalInitialTab}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {modals.isSyncModalOpen && (
          <SyncCalendarModal
            isOpen={modals.isSyncModalOpen}
            onClose={modalActions.closeSyncModal}
            onImport={eventActions.import}
            onClearSyncedEvents={eventActions.clearExternal}
            onApplySyncChanges={eventActions.applySync}
            selectedDate={selectedDate}
            existingEvents={events}
          />
        )}
      </Suspense>
      {modals.isSettingsModalOpen && (
        <SettingsModal
          isOpen={modals.isSettingsModalOpen}
          onClose={modalActions.closeSettingsModal}
        />
      )}
      <PastTimeConflictModal
        isOpen={pending.task !== null}
        onClose={() => modalActions.setPendingTask(null)}
        onResolve={handlePastTimeResolve}
        taskTitle={pending.task?.task.title ?? ''}
        attemptedTime={pending.task?.attemptedTime ?? ''}
      />
      <NoSlotModal
        isOpen={pending.unscheduledTasks.length > 0}
        onClose={() => modalActions.setPendingUnscheduledTasks([])}
        onResolve={handleNoSlotResolve}
        unscheduledCount={pending.unscheduledTasks.length}
      />

      {/* Discard draft confirmation dialog */}
      <AlertDialog open={pending.dateChange !== null} onOpenChange={(open) => !open && handleCancelDateChange()}>
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
