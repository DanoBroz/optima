import { useState, useMemo } from 'react';
import type { CalendarEvent, DayCapacity, DailyEnergy, DayIntention, Task } from '@/types/task';
import type { TaskChange } from '@/hooks/useDraft';
import { DailyEnergySelector } from '@/components/dashboard/DailyEnergySelector';
import { TaskList } from '@/components/dashboard/TaskList';
import { MobileBacklogList } from '@/components/dashboard/MobileBacklogList';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { TimelineView } from '@/components/dashboard/TimelineView';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { ChangesSummary } from '@/hooks/useDraft';
import { RefreshCw, Calendar, Inbox } from 'lucide-react';
import { DashboardProvider, type DashboardTaskActions, type DashboardEventActions } from '@/contexts/DashboardContext';

type TabType = 'timeline' | 'today' | 'backlog';

interface GhostTask {
  task: Task;
  originalTime: string;
}

type TaskActions = {
  toggle: (id: string) => void;
  remove: (id: string) => void;
  defer: (id: string) => void;
  reschedule: (id: string, time: string) => void;
  autoSchedule: () => void;
  autoScheduleSelected: (selectedIds: string[]) => Promise<{ scheduled: Task[]; unscheduled: Task[] }>;
  autoScheduleBacklog: () => Promise<{ scheduled: Task[]; unscheduled: Task[] }>;
  moveToBacklog: (id: string) => void;
  scheduleToToday: (id: string) => void;
  toggleLock: (id: string) => void;
  edit: (id: string) => void;
};

type EnergyActions = {
  setLevel: (level: DailyEnergy['energy_level'], notes?: string) => void;
};

type IntentionActions = {
  set: (intention: DayIntention) => void;
};

interface DraftModeProps {
  isActive: boolean;
  changes?: Map<string, TaskChange>;
  ghostTasks?: GhostTask[];
  unscheduledTasks?: Task[];
  todayTasks?: Task[];
  tomorrowTasks?: Task[];
  tomorrowDate?: string;
  currentDate?: string;
  changesSummary: ChangesSummary;
  isProcessing?: boolean;
  onCancel: () => void;
  onReOptimize: () => void;
  onApply: () => void;
  onScheduleUnscheduled?: (taskId: string, time: string) => void;
  onScheduleTomorrow?: (taskId: string) => void;
}

interface DashboardPanelsProps {
  activeTab: TabType;
  scheduledTasks: Task[];
  unscheduledTasks: Task[];
  /** Tasks scheduled for today with no time (backlog section) */
  todayBacklogTasks: Task[];
  /** Tasks with no date (true backlog) */
  trueUnscheduledTasks: Task[];
  /** Tasks with future dates (scheduled for later) */
  deferredTasks: Task[];
  tasks: Task[];
  events: CalendarEvent[];
  dailyEnergy: DailyEnergy | null;
  dayIntention: DayIntention;
  capacity: DayCapacity;
  isScheduling: boolean;
  onEventClick: (event: CalendarEvent) => void;
  onRestoreEvent: (id: string) => void;
  onOpenSyncModal: () => void;
  taskActions: TaskActions;
  energyActions: EnergyActions;
  intentionActions: IntentionActions;
  /** Draft mode props */
  draftMode?: DraftModeProps;
}

function SyncCalendarButton({
  onOpenSyncModal
}: {
  onOpenSyncModal: () => void;
}) {
  return (
    <div className="px-1 py-2">
      <button
        onClick={onOpenSyncModal}
        className="flex items-center justify-center gap-2 w-full text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors py-3 px-4 rounded-xl font-semibold border border-primary/20"
        title="Sync iOS Calendar"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Sync Calendar</span>
      </button>
    </div>
  );
}

export function DashboardPanels({
  activeTab,
  scheduledTasks,
  unscheduledTasks,
  todayBacklogTasks,
  trueUnscheduledTasks,
  deferredTasks,
  tasks,
  events,
  dailyEnergy,
  dayIntention,
  capacity,
  isScheduling,
  onEventClick,
  onRestoreEvent,
  onOpenSyncModal,
  taskActions,
  energyActions,
  intentionActions,
  draftMode,
}: DashboardPanelsProps) {
  const [sidebarTab, setSidebarTab] = useState<'today' | 'backlog'>('today');

  // In draft mode, use the proposed tasks from draft instead of actual scheduled tasks
  const displayTasks = draftMode?.isActive && draftMode.unscheduledTasks
    ? scheduledTasks // In draft mode, scheduledTasks will be the proposed tasks passed from Index
    : scheduledTasks;

  // Memoize context values to prevent unnecessary re-renders
  const dashboardTaskActions: DashboardTaskActions = useMemo(() => ({
    onToggle: taskActions.toggle,
    onDelete: taskActions.remove,
    onDefer: taskActions.defer,
    onReschedule: taskActions.reschedule,
    onLockToggle: taskActions.toggleLock,
    onMoveToBacklog: taskActions.moveToBacklog,
    onScheduleToToday: taskActions.scheduleToToday,
    onEdit: taskActions.edit,
  }), [taskActions]);

  const dashboardEventActions: DashboardEventActions = useMemo(() => ({
    onClick: onEventClick,
    onRestore: onRestoreEvent,
  }), [onEventClick, onRestoreEvent]);

  return (
    <DashboardProvider taskActions={dashboardTaskActions} eventActions={dashboardEventActions}>
    <main className="flex-1 flex flex-col md:flex-row gap-5 md:gap-8 container py-2 md:py-6 pb-28 md:pb-6 md:overflow-hidden">
      {/* Desktop sidebar - tabbed */}
      <aside className="hidden md:block w-[340px] flex-shrink-0 h-full">
        <Tabs
          value={sidebarTab}
          onValueChange={(v) => setSidebarTab(v as 'today' | 'backlog')}
          className="flex flex-col"
        >
          <TabsList className="w-full grid grid-cols-2 h-11 p-1 bg-secondary/50 rounded-2xl mb-4">
            <TabsTrigger
              value="today"
              className="flex items-center justify-center gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              Today
            </TabsTrigger>
            <TabsTrigger
              value="backlog"
              className="flex items-center justify-center gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Inbox className="w-4 h-4" />
              Backlog
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="flex flex-col gap-5 mt-0 animate-fade-in">
            <DailyEnergySelector
              currentLevel={dailyEnergy?.energy_level || null}
              onSelect={energyActions.setLevel}
            />
            <StatsBar
              tasks={tasks}
              capacity={capacity}
              energyLevel={dailyEnergy?.energy_level}
              dayIntention={dayIntention}
              onIntentionChange={intentionActions.set}
            />
          </TabsContent>

          <TabsContent value="backlog" className="flex flex-col gap-5 mt-0 animate-fade-in">
            <TaskList
              tasks={unscheduledTasks}
              todayTasks={todayBacklogTasks}
              unscheduledTasks={trueUnscheduledTasks}
              deferredTasks={deferredTasks}
              onToggleTask={taskActions.toggle}
              onDeleteTask={taskActions.remove}
              onEditTask={taskActions.edit}
              onScheduleToToday={taskActions.scheduleToToday}
              onOptimizeAll={taskActions.autoScheduleBacklog}
              isScheduling={isScheduling}
              draftUnscheduledTasks={draftMode?.isActive ? draftMode.unscheduledTasks : undefined}
              onScheduleUnscheduled={draftMode?.onScheduleUnscheduled}
              onScheduleTomorrow={draftMode?.onScheduleTomorrow}
            />
            <SyncCalendarButton onOpenSyncModal={onOpenSyncModal} />
          </TabsContent>
        </Tabs>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0 md:min-h-0">
        {/* Mobile views */}
        <div className="md:hidden flex flex-col min-h-0">
          {activeTab === 'timeline' && (
            <div className="flex-1 min-h-0 bg-card rounded-3xl shadow-card border border-border/30 overflow-hidden animate-fade-in">
              <TimelineView
                tasks={draftMode?.isActive ? (draftMode.todayTasks ?? displayTasks) : displayTasks}
                events={events}
                onToggleTask={taskActions.toggle}
                onDeleteTask={taskActions.remove}
                onDeferTask={taskActions.defer}
                onRescheduleTask={taskActions.reschedule}
                onLockToggle={taskActions.toggleLock}
                onMoveToBacklog={taskActions.moveToBacklog}
                onEditTask={taskActions.edit}
                draftMode={draftMode?.isActive}
                draftChanges={draftMode?.changes}
                ghostTasks={draftMode?.ghostTasks}
                tomorrowTasks={draftMode?.tomorrowTasks}
                tomorrowDate={draftMode?.tomorrowDate}
                currentDate={draftMode?.currentDate}
                draftBarProps={draftMode?.isActive ? {
                  changesSummary: draftMode.changesSummary,
                  onCancel: draftMode.onCancel,
                  onReOptimize: draftMode.onReOptimize,
                  onApply: draftMode.onApply,
                  isProcessing: draftMode.isProcessing,
                } : undefined}
              />
            </div>
          )}
          {activeTab === 'today' && (
            <div className="flex-1 space-y-4 animate-fade-in overflow-y-auto pb-24">
              <DailyEnergySelector
                currentLevel={dailyEnergy?.energy_level || null}
                onSelect={energyActions.setLevel}
              />
              <StatsBar
                tasks={tasks}
                capacity={capacity}
                energyLevel={dailyEnergy?.energy_level}
                dayIntention={dayIntention}
                onIntentionChange={intentionActions.set}
              />
            </div>
          )}
          {activeTab === 'backlog' && (
            <div className="flex-1 space-y-4 animate-fade-in overflow-y-auto pb-24">
              <MobileBacklogList
                todayTasks={todayBacklogTasks}
                unscheduledTasks={trueUnscheduledTasks}
                deferredTasks={deferredTasks}
                onToggleTask={taskActions.toggle}
                onDeleteTask={taskActions.remove}
                onDeferTask={taskActions.defer}
                onEditTask={taskActions.edit}
                onLockToggle={taskActions.toggleLock}
                onScheduleToToday={taskActions.scheduleToToday}
                onOptimizeAll={taskActions.autoScheduleBacklog}
                isScheduling={isScheduling}
              />
              <SyncCalendarButton onOpenSyncModal={onOpenSyncModal} />
            </div>
          )}
        </div>

        {/* Desktop timeline */}
        <div className="hidden md:flex flex-col flex-1 bg-card rounded-3xl shadow-card border border-border/30 overflow-hidden animate-slide-up">
          <TimelineView
            tasks={draftMode?.isActive ? (draftMode.todayTasks ?? displayTasks) : displayTasks}
            events={events}
            onToggleTask={taskActions.toggle}
            onDeleteTask={taskActions.remove}
            onDeferTask={taskActions.defer}
            onRescheduleTask={taskActions.reschedule}
            onLockToggle={taskActions.toggleLock}
            onMoveToBacklog={taskActions.moveToBacklog}
            onEditTask={taskActions.edit}
            draftMode={draftMode?.isActive}
            draftChanges={draftMode?.changes}
            ghostTasks={draftMode?.ghostTasks}
            tomorrowTasks={draftMode?.tomorrowTasks}
            tomorrowDate={draftMode?.tomorrowDate}
            currentDate={draftMode?.currentDate}
            draftBarProps={draftMode?.isActive ? {
              changesSummary: draftMode.changesSummary,
              onCancel: draftMode.onCancel,
              onReOptimize: draftMode.onReOptimize,
              onApply: draftMode.onApply,
              isProcessing: draftMode.isProcessing,
            } : undefined}
          />
        </div>
      </div>
    </main>
    </DashboardProvider>
  );
}
