import { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { TabBar } from '@/components/dashboard/TabBar';
import { AddTaskModal } from '@/components/dashboard/AddTaskModal';
import { AddEventModal } from '@/components/dashboard/AddEventModal';
import { SyncCalendarModal } from '@/components/dashboard/SyncCalendarModal';
import { SettingsModal } from '@/components/dashboard/SettingsModal';
import { DashboardPanels } from '@/components/dashboard/DashboardPanels';
import { useTasks } from '@/hooks/useTasks';
import type { CalendarEvent } from '@/types/task';

type TabType = 'timeline' | 'tasks' | 'all';

const Index = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('timeline');

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

  const { task: taskActions, event: eventActions, energy: energyActions } = actions;

  const handleLockToggle = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      taskActions.update(id, { is_locked: !task.is_locked });
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleEventModalClose = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onAddTask={() => setIsTaskModalOpen(true)} 
        onAutoSchedule={taskActions.autoSchedule}
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
        onLockToggle={handleLockToggle}
        onEventClick={handleEventClick}
        onOpenEventModal={() => {
          setEditingEvent(null);
          setIsEventModalOpen(true);
        }}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        taskActions={taskActions}
        energyActions={energyActions}
      />



      {/* Mobile tab bar */}
      <TabBar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onAddTask={() => setIsTaskModalOpen(true)}
        onAutoSchedule={taskActions.autoSchedule}
        isScheduling={isScheduling}
      />

      {/* Modals */}
      <AddTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onAdd={taskActions.add}
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
    </div>
  );
};

export default Index;
