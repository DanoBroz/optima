import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Header } from '@/components/dashboard/Header';
import { TimelineView } from '@/components/dashboard/TimelineView';
import { TaskList } from '@/components/dashboard/TaskList';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { TabBar } from '@/components/dashboard/TabBar';
import { AddTaskModal } from '@/components/dashboard/AddTaskModal';
import { AddEventModal } from '@/components/dashboard/AddEventModal';
import { DailyEnergySelector } from '@/components/dashboard/DailyEnergySelector';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

type TabType = 'timeline' | 'tasks' | 'all';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
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
    getCapacity,
    setDailyEnergyLevel,
  } = useTasks(selectedDate);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleLockToggle = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      updateTask(id, { is_locked: !task.is_locked });
    }
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
          <button
            onClick={() => setIsEventModalOpen(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            + Add calendar event
          </button>
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
        onClose={() => setIsEventModalOpen(false)}
        onAdd={addEvent}
        selectedDate={selectedDate}
      />
    </div>
  );
};

export default Index;
