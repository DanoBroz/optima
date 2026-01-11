import { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { TimelineView } from '@/components/dashboard/TimelineView';
import { TaskList } from '@/components/dashboard/TaskList';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { TabBar } from '@/components/dashboard/TabBar';
import { AddTaskModal } from '@/components/dashboard/AddTaskModal';
import { AddEventModal } from '@/components/dashboard/AddEventModal';
import { SyncCalendarModal } from '@/components/dashboard/SyncCalendarModal';
import { DailyEnergySelector } from '@/components/dashboard/DailyEnergySelector';
import { useTasks } from '@/hooks/useTasks';
import type { CalendarEvent } from '@/types/task';

type TabType = 'timeline' | 'tasks' | 'all';

const Index = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('timeline');

  const {
    tasks,
    scheduledTasks,
    unscheduledTasks,
    events,
    dailyEnergy,
    isScheduling,
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    rescheduleTask,
    deferTask,
    autoSchedule,
    addEvent,
    updateEvent,
    deleteEvent,
    importEvents,
    getCapacity,
    setDailyEnergyLevel,
  } = useTasks(selectedDate);

  const handleLockToggle = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      updateTask(id, { is_locked: !task.is_locked });
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

  const capacity = getCapacity();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onAddTask={() => setIsTaskModalOpen(true)} 
        onAutoSchedule={autoSchedule}
        isScheduling={isScheduling}
      />

      {/* Main content area */}
      <main className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 container py-4 md:py-6">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col gap-4 w-80 flex-shrink-0">
          <div className="animate-slide-up" style={{ animationDelay: '50ms' }}>
            <DailyEnergySelector 
              currentLevel={dailyEnergy?.energy_level || null} 
              onSelect={setDailyEnergyLevel} 
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <StatsBar tasks={tasks} capacity={capacity} energyLevel={dailyEnergy?.energy_level} />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <TaskList
              tasks={unscheduledTasks}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onDeferTask={deferTask}
              onAutoSchedule={autoSchedule}
              isScheduling={isScheduling}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingEvent(null);
                setIsEventModalOpen(true);
              }}
              className="flex-1 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 text-left"
            >
              + Add calendar event
            </button>
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="text-sm text-primary hover:text-primary/80 transition-colors py-2 px-3 rounded-lg hover:bg-primary/10"
              title="Sync iOS Calendar"
            >
              Sync
            </button>
          </div>
        </aside>

        {/* Main timeline/content area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Mobile tabs content */}
          <div className="md:hidden flex flex-col flex-1 min-h-0">
            {activeTab === 'timeline' && (
              <div className="flex-1 bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden animate-fade-in">
                <TimelineView
                  tasks={scheduledTasks}
                  events={events}
                  onToggleTask={toggleTask}
                  onDeleteTask={deleteTask}
                  onDeferTask={deferTask}
                  onRescheduleTask={rescheduleTask}
                  onLockToggle={handleLockToggle}
                  onEventClick={handleEventClick}
                />
              </div>
            )}
            {activeTab === 'tasks' && (
              <div className="flex-1 space-y-4 animate-fade-in">
                <DailyEnergySelector 
                  currentLevel={dailyEnergy?.energy_level || null} 
                  onSelect={setDailyEnergyLevel} 
                />
                <StatsBar tasks={tasks} capacity={capacity} energyLevel={dailyEnergy?.energy_level} />
                <TaskList
                  tasks={unscheduledTasks}
                  onToggleTask={toggleTask}
                  onDeleteTask={deleteTask}
                  onDeferTask={deferTask}
                  onAutoSchedule={autoSchedule}
                  isScheduling={isScheduling}
                />
              </div>
            )}
            {activeTab === 'all' && (
              <div className="flex-1 animate-fade-in">
                <TaskList
                  tasks={tasks}
                  onToggleTask={toggleTask}
                  onDeleteTask={deleteTask}
                  onDeferTask={deferTask}
                  title="All Tasks"
                />
              </div>
            )}
          </div>

          {/* Desktop timeline */}
          <div className="hidden md:flex flex-1 bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden animate-slide-up">
            <TimelineView
              tasks={scheduledTasks}
              events={events}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onDeferTask={deferTask}
              onRescheduleTask={rescheduleTask}
              onLockToggle={handleLockToggle}
              onEventClick={handleEventClick}
            />
          </div>
        </div>
      </main>

      {/* Mobile tab bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Modals */}
      <AddTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onAdd={addTask}
      />
      <AddEventModal
        isOpen={isEventModalOpen}
        onClose={handleEventModalClose}
        onAdd={addEvent}
        onUpdate={updateEvent}
        onDelete={deleteEvent}
        selectedDate={selectedDate}
        editEvent={editingEvent}
      />
      <SyncCalendarModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onImport={importEvents}
        selectedDate={selectedDate}
      />
    </div>
  );
};

export default Index;
