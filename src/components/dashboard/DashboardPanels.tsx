import type { CalendarEvent, DayCapacity, DailyEnergy, Task } from '@/types/task';
import { DailyEnergySelector } from '@/components/dashboard/DailyEnergySelector';
import { TaskList } from '@/components/dashboard/TaskList';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { TimelineView } from '@/components/dashboard/TimelineView';

type TabType = 'timeline' | 'tasks' | 'all';

type TaskActions = {
  toggle: (id: string) => void;
  remove: (id: string) => void;
  defer: (id: string) => void;
  reschedule: (id: string, time: string) => void;
  autoSchedule: () => void;
};

type EnergyActions = {
  setLevel: (level: DailyEnergy['energy_level'], notes?: string) => void;
};

interface DashboardPanelsProps {
  activeTab: TabType;
  scheduledTasks: Task[];
  unscheduledTasks: Task[];
  tasks: Task[];
  events: CalendarEvent[];
  dailyEnergy: DailyEnergy | null;
  capacity: DayCapacity;
  isScheduling: boolean;
  onLockToggle: (id: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onOpenEventModal: () => void;
  onOpenSyncModal: () => void;
  taskActions: TaskActions;
  energyActions: EnergyActions;
}

export function DashboardPanels({
  activeTab,
  scheduledTasks,
  unscheduledTasks,
  tasks,
  events,
  dailyEnergy,
  capacity,
  isScheduling,
  onLockToggle,
  onEventClick,
  onOpenEventModal,
  onOpenSyncModal,
  taskActions,
  energyActions,
}: DashboardPanelsProps) {
  return (
    <main className="flex-1 flex flex-col md:flex-row gap-5 md:gap-8 container py-2 md:py-6 pb-28 md:pb-6">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col gap-5 w-[340px] flex-shrink-0">
        <div className="animate-slide-up" style={{ animationDelay: '50ms' }}>
          <DailyEnergySelector
            currentLevel={dailyEnergy?.energy_level || null}
            onSelect={energyActions.setLevel}
          />
        </div>
        <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <StatsBar tasks={tasks} capacity={capacity} energyLevel={dailyEnergy?.energy_level} />
        </div>
        <div className="animate-slide-up flex-1" style={{ animationDelay: '200ms' }}>
          <TaskList
            tasks={unscheduledTasks}
            onToggleTask={taskActions.toggle}
            onDeleteTask={taskActions.remove}
            onDeferTask={taskActions.defer}
            onAutoSchedule={taskActions.autoSchedule}
            isScheduling={isScheduling}
          />
        </div>
        <div className="flex items-center gap-2 px-1">
          <button
            onClick={onOpenEventModal}
            className="flex-1 text-sm text-muted-foreground hover:text-foreground transition-colors py-2.5 text-left font-medium"
          >
            + Add calendar event
          </button>
          <button
            onClick={onOpenSyncModal}
            className="text-sm text-primary hover:text-primary/80 transition-colors py-2.5 px-4 rounded-2xl hover:bg-primary/10 font-semibold"
            title="Sync iOS Calendar"
          >
            Sync
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Mobile views */}
        <div className="md:hidden flex flex-col flex-1 min-h-0">
          {activeTab === 'timeline' && (
            <div className="flex-1 bg-card rounded-3xl shadow-card border border-border/30 overflow-hidden animate-fade-in">
              <TimelineView
                tasks={scheduledTasks}
                events={events}
                onToggleTask={taskActions.toggle}
                onDeleteTask={taskActions.remove}
                onDeferTask={taskActions.defer}
                onRescheduleTask={taskActions.reschedule}
                onLockToggle={onLockToggle}
                onEventClick={onEventClick}
              />
            </div>
          )}
          {activeTab === 'tasks' && (
            <div className="flex-1 space-y-4 animate-fade-in overflow-y-auto pb-4">
              <DailyEnergySelector
                currentLevel={dailyEnergy?.energy_level || null}
                onSelect={energyActions.setLevel}
              />
              <StatsBar tasks={tasks} capacity={capacity} energyLevel={dailyEnergy?.energy_level} />
              <TaskList
                tasks={unscheduledTasks}
                onToggleTask={taskActions.toggle}
                onDeleteTask={taskActions.remove}
                onDeferTask={taskActions.defer}
                onAutoSchedule={taskActions.autoSchedule}
                isScheduling={isScheduling}
              />
            </div>
          )}
          {activeTab === 'all' && (
            <div className="flex-1 animate-fade-in">
              <TaskList
                tasks={tasks}
                onToggleTask={taskActions.toggle}
                onDeleteTask={taskActions.remove}
                onDeferTask={taskActions.defer}
                title="All Tasks"
              />
            </div>
          )}
        </div>

        {/* Desktop timeline */}
        <div className="hidden md:flex flex-1 bg-card rounded-3xl shadow-card border border-border/30 overflow-hidden animate-slide-up">
          <TimelineView
            tasks={scheduledTasks}
            events={events}
            onToggleTask={taskActions.toggle}
            onDeleteTask={taskActions.remove}
            onDeferTask={taskActions.defer}
            onRescheduleTask={taskActions.reschedule}
            onLockToggle={onLockToggle}
            onEventClick={onEventClick}
          />
        </div>
      </div>
    </main>
  );
}
