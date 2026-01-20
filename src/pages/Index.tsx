import { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { TabBar } from '@/components/dashboard/TabBar';
import { AddTaskModal } from '@/components/dashboard/AddTaskModal';
import { AddEventModal } from '@/components/dashboard/AddEventModal';
import { SyncCalendarModal } from '@/components/dashboard/SyncCalendarModal';
import { SettingsModal } from '@/components/dashboard/SettingsModal';
import { DashboardPanels } from '@/components/dashboard/DashboardPanels';
import { PastTimeConflictModal, type PastTimeResolution } from '@/components/dashboard/PastTimeConflictModal';
import { NoSlotModal, type NoSlotResolution } from '@/components/dashboard/NoSlotModal';
import { useTasks } from '@/hooks/useTasks';
import type { CalendarEvent, Task, AvailabilityPreset } from '@/types/task';
import { format, addDays } from 'date-fns';

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
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [pendingTask, setPendingTask] = useState<PendingTask | null>(null);
  const [pendingUnscheduledTasks, setPendingUnscheduledTasks] = useState<Task[]>([]);

  const {
    tasks,
    scheduledTasks,
    unscheduledTasks,
    events,
    dailyEnergy,
    isScheduling,
    capacity,
    actions,
  } = useTasks(selectedDate);

  const { task: taskActions, event: eventActions, energy: energyActions, scheduling } = actions;

  const handleEventClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleEventModalClose = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  const handleAddTask = (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
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
          task.availability_preset as AvailabilityPreset
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
            task.availability_preset as AvailabilityPreset
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
          task.availability_preset as AvailabilityPreset
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
    const result = await taskActions.autoScheduleSelected(selectedIds);
    if (result.unscheduled.length > 0) {
      setPendingUnscheduledTasks(result.unscheduled);
    }
    return result;
  };

  const handleOptimizeAll = async (): Promise<{ scheduled: Task[]; unscheduled: Task[] }> => {
    const result = await taskActions.autoScheduleBacklog();
    if (result.unscheduled.length > 0) {
      setPendingUnscheduledTasks(result.unscheduled);
    }
    return result;
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
    const result = await taskActions.autoSchedule();
    if (result.unscheduled.length > 0) {
      setPendingUnscheduledTasks(result.unscheduled);
    }
    return result;
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onAddTask={() => setIsTaskModalOpen(true)} 
        onAutoSchedule={handleHeaderOptimize}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isScheduling={isScheduling}
      />

      <DashboardPanels
        activeTab={activeTab}
        scheduledTasks={scheduledTasks}
        unscheduledTasks={unscheduledTasks}
        tasks={tasks}
        events={events}
        dailyEnergy={dailyEnergy}
        capacity={capacity}
        isScheduling={isScheduling}
        onEventClick={handleEventClick}
        onOpenEventModal={() => {
          setEditingEvent(null);
          setIsEventModalOpen(true);
        }}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        taskActions={{
          ...taskActions,
          autoScheduleSelected: handleOptimizeSelected,
          autoScheduleBacklog: handleOptimizeAll,
        }}
        energyActions={energyActions}
      />



      {/* Mobile tab bar */}
      <TabBar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onAddTask={() => setIsTaskModalOpen(true)}
        onAutoSchedule={handleHeaderOptimize}
        isScheduling={isScheduling}
      />

      {/* Modals */}
      <AddTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onAdd={handleAddTask}
      />
      <AddEventModal
        isOpen={isEventModalOpen}
        onClose={handleEventModalClose}
        onAdd={eventActions.add}
        onUpdate={eventActions.update}
        onDelete={eventActions.remove}
        selectedDate={selectedDate}
        editEvent={editingEvent}
      />
      <SyncCalendarModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onImport={eventActions.import}
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
    </div>
  );
};

export default Index;
