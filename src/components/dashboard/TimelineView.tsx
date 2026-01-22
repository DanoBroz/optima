import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { Task, CalendarEvent } from '@/types/task';
import type { TaskChange, ChangesSummary } from '@/hooks/useDraft';
import { TaskCard } from './TaskCard';
import { EventCard } from './EventCard';
import { GhostTaskCard } from './GhostTaskCard';
import { DraftBar } from './DraftBar';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';

interface GhostTask {
  task: Task;
  originalTime: string;
}

interface DraftBarProps {
  changesSummary: ChangesSummary;
  onCancel: () => void;
  onReOptimize: () => void;
  onApply: () => void;
  isProcessing?: boolean;
}

interface TimelineViewProps {
  tasks: Task[];
  events: CalendarEvent[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onDeferTask: (id: string) => void;
  onRescheduleTask: (id: string, time: string) => void;
  onLockToggle: (id: string) => void;
  onMoveToBacklog?: (id: string) => void;
  onEditTask?: (id: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onRestoreEvent?: (id: string) => void;
  /** Draft mode props */
  draftMode?: boolean;
  draftChanges?: Map<string, TaskChange>;
  ghostTasks?: GhostTask[];
  /** Tomorrow tasks for dual-pane view */
  tomorrowTasks?: Task[];
  tomorrowDate?: string;
  currentDate?: string;
  /** DraftBar props for sticky header */
  draftBarProps?: DraftBarProps;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WORK_HOURS_START = 6;
const WORK_HOURS_END = 22;

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

function formatDateHeader(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return format(date, 'd. MMM');
  } catch {
    return '';
  }
}

export function TimelineView({
  tasks,
  events,
  onToggleTask,
  onDeleteTask,
  onDeferTask,
  onRescheduleTask,
  onLockToggle,
  onMoveToBacklog,
  onEditTask,
  onEventClick,
  onRestoreEvent,
  draftMode = false,
  draftChanges,
  ghostTasks = [],
  tomorrowTasks = [],
  tomorrowDate,
  currentDate,
  draftBarProps,
}: TimelineViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const todayScrollRef = useRef<HTMLDivElement>(null);
  const tomorrowScrollRef = useRef<HTMLDivElement>(null);
  const nowIndicatorRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  const hasTomorrowTasks = tomorrowTasks && tomorrowTasks.length > 0;

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // Track indicator position based on actual DOM measurements
  // This accounts for variable row heights when tasks/events expand rows
  const [indicatorTop, setIndicatorTop] = useState<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Fallback calculation for initial render (before DOM is ready)
  // Uses fixed 56px height assumption - close enough until real measurement kicks in
  const fallbackPosition = useMemo(() => {
    const hourHeight = 56;
    return currentHour * hourHeight + (currentMinute / 60) * hourHeight;
  }, [currentHour, currentMinute]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate indicator position from actual DOM measurements
  const updateIndicatorPosition = useCallback(() => {
    // Find the VISIBLE hour row - important because both desktop and mobile containers
    // render the timeline, but only one is visible. Query for the one with actual dimensions.
    const allRows = document.querySelectorAll(`[data-hour-row="${currentHour}"]`);
    const visibleRow = Array.from(allRows).find(
      (el) => el instanceof HTMLElement && el.offsetHeight > 0
    ) as HTMLElement | undefined;

    // Only use DOM measurement if we found a visible element
    if (visibleRow) {
      const rowTop = visibleRow.offsetTop;
      const rowHeight = visibleRow.offsetHeight;
      const minuteOffset = (currentMinute / 60) * rowHeight;
      setIndicatorTop(rowTop + minuteOffset);
    } else {
      // Fall back to calculated position until DOM is ready
      setIndicatorTop(fallbackPosition);
    }
  }, [currentHour, currentMinute, fallbackPosition]);

  // Effect to set up observation after component mounts
  useEffect(() => {
    // Use double requestAnimationFrame to ensure layout is complete
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateIndicatorPosition();

        // Clean up previous observer if it exists
        resizeObserverRef.current?.disconnect();

        // Set up ResizeObserver to update when row heights change
        // Observe all visible hour rows (ones with the data attribute that have dimensions)
        const resizeObserver = new ResizeObserver(updateIndicatorPosition);
        const allRows = document.querySelectorAll('[data-hour-row]');
        allRows.forEach(row => {
          if (row instanceof HTMLElement && row.offsetHeight > 0) {
            resizeObserver.observe(row);
          }
        });

        resizeObserverRef.current = resizeObserver;
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      resizeObserverRef.current?.disconnect();
    };
  }, [currentHour, currentMinute, tasks, events, updateIndicatorPosition]);

  // Scroll to current time indicator on mount and when position is calculated
  useEffect(() => {
    const position = indicatorTop ?? fallbackPosition;
    if (nowIndicatorRef.current && todayScrollRef.current && position > 0) {
      nowIndicatorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [indicatorTop, fallbackPosition]);

  // Synchronized scrolling handlers
  const handleTodayScroll = useCallback(() => {
    if (isScrollingRef.current) return;
    if (!todayScrollRef.current || !tomorrowScrollRef.current) return;
    isScrollingRef.current = true;
    tomorrowScrollRef.current.scrollTop = todayScrollRef.current.scrollTop;
    requestAnimationFrame(() => { isScrollingRef.current = false; });
  }, []);

  const handleTomorrowScroll = useCallback(() => {
    if (isScrollingRef.current) return;
    if (!todayScrollRef.current || !tomorrowScrollRef.current) return;
    isScrollingRef.current = true;
    todayScrollRef.current.scrollTop = tomorrowScrollRef.current.scrollTop;
    requestAnimationFrame(() => { isScrollingRef.current = false; });
  }, []);

  // Compute compact hours for tomorrow (only hours with tasks)
  const tomorrowHours = useMemo(() => {
    if (!tomorrowTasks?.length) return [];
    const hours = new Set<number>();
    tomorrowTasks.forEach(task => {
      if (task.scheduled_time) {
        hours.add(parseInt(task.scheduled_time.split(':')[0], 10));
      }
    });
    return Array.from(hours).sort((a, b) => a - b);
  }, [tomorrowTasks]);

  const getTasksForHour = useCallback((hour: number, taskList: Task[] = tasks) => {
    return taskList.filter((task) => {
      if (!task.scheduled_time) return false;
      const taskHour = parseInt(task.scheduled_time.split(':')[0], 10);
      return taskHour === hour;
    });
  }, [tasks]);

  const getGhostsForHour = useCallback((hour: number) => {
    if (!draftMode) return [];
    return ghostTasks.filter((ghost) => {
      const ghostHour = parseInt(ghost.originalTime.split(':')[0], 10);
      return ghostHour === hour;
    });
  }, [draftMode, ghostTasks]);

  const getEventsForHour = useCallback((hour: number) => {
    return events.filter((event) => {
      const eventHour = new Date(event.start_time).getHours();
      return eventHour === hour;
    });
  }, [events]);

  const handleDragOver = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    setDragOverHour(hour);
  };

  const handleDragLeave = () => {
    setDragOverHour(null);
  };

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      const time = `${String(hour).padStart(2, '0')}:00`;
      onRescheduleTask(taskId, time);
    }
    setDragOverHour(null);
  };

  // Render a single hour row for the timeline
  const renderHourRow = (
    hour: number,
    hourTasks: Task[],
    hourEvents: CalendarEvent[],
    hourGhosts: GhostTask[],
    options: {
      isTomorrow?: boolean;
    } = {}
  ) => {
    const { isTomorrow = false } = options;
    const isWorkHour = hour >= WORK_HOURS_START && hour < WORK_HOURS_END;
    const isPast = !isTomorrow && hour < currentHour;
    const isCurrent = !isTomorrow && hour === currentHour;
    const isDragOver = dragOverHour === hour;

    return (
      <div
        key={hour}
        data-hour-row={!isTomorrow ? hour : undefined}
        className={cn(
          "relative flex min-h-[56px] border-b transition-colors",
          isTomorrow
            ? "border-[hsl(var(--tomorrow-foreground)/0.1)]"
            : "border-border/30",
          !isWorkHour && !isTomorrow && "bg-secondary/20",
          isPast && "opacity-50",
          isDragOver && "bg-primary/10"
        )}
        onDragOver={(e) => handleDragOver(e, hour)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, hour)}
      >
        {/* Hour label */}
        <div className="w-12 flex-shrink-0 py-2 px-2">
          <span
            className={cn(
              "text-[11px] font-medium tabular-nums",
              isTomorrow
                ? "text-[hsl(var(--tomorrow-foreground)/0.7)]"
                : isCurrent 
                  ? "text-primary" 
                  : "text-muted-foreground"
            )}
          >
            {formatHour(hour)}
          </span>
        </div>

        {/* Timeline line */}
        <div className={cn(
          "absolute left-12 top-0 bottom-0 w-px",
          isTomorrow 
            ? "bg-[hsl(var(--tomorrow-foreground)/0.15)]" 
            : "bg-border/50"
        )} />

        {/* Events and tasks for this hour */}
        <div className="flex-1 py-1.5 pl-3 pr-2">
          {/* Calendar events - display side by side when multiple */}
          {!isTomorrow && hourEvents.length > 0 && (
            <div className={cn(
              "flex gap-1.5 mb-1.5",
              hourEvents.length > 1 ? "flex-row" : "flex-col"
            )}>
              {hourEvents.map((event) => (
                <div
                  key={event.id}
                  className={hourEvents.length > 1 ? "flex-1 min-w-0" : "w-full"}
                >
                  <EventCard
                    event={event}
                    onClick={onEventClick ? () => onEventClick(event) : undefined}
                    onRestore={onRestoreEvent ? () => onRestoreEvent(event.id) : undefined}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Ghost tasks (show original positions for moved tasks in draft mode) */}
          {draftMode && !isTomorrow && hourGhosts.length > 0 && (
            <div className="space-y-1.5 mb-1.5">
              {hourGhosts.map((ghost) => (
                <GhostTaskCard
                  key={`ghost-${ghost.task.id}`}
                  task={ghost.task}
                  originalTime={ghost.originalTime}
                />
              ))}
            </div>
          )}

          {/* Tasks */}
          {hourTasks.length > 0 && (
            <div className="space-y-1.5">
              {hourTasks.map((task, index) => {
                const change = draftMode ? draftChanges?.get(task.id) : undefined;

                return (
                  <div
                    key={task.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                    draggable={!isTomorrow}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('taskId', task.id);
                    }}
                  >
                    <TaskCard
                      task={task}
                      onToggle={onToggleTask}
                      onDelete={onDeleteTask}
                      onDefer={onDeferTask}
                      onLockToggle={onLockToggle}
                      onMoveToBacklog={!isTomorrow ? onMoveToBacklog : undefined}
                      onEdit={onEditTask}
                      compact
                      draggable={!isTomorrow}
                      hideActions={draftMode}
                      changeType={change?.type}
                      originalTime={change?.originalTime}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render today's timeline content
  const renderTodayTimeline = () => (
    <div className="relative">
      {/* Current time indicator */}
      <div
        ref={nowIndicatorRef}
        className="absolute left-0 right-0 z-10 pointer-events-none"
        style={{ top: `${indicatorTop ?? fallbackPosition}px` }}
      >
        <div className="flex items-center">
          {/* Spacer to align with timeline content (matches hour label column) */}
          <div className="w-12 flex-shrink-0" />
          <div className="relative -ml-[5px]">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-primary pulse-ring" />
          </div>
          <div className="flex-1 h-[2px] bg-primary rounded-full ml-1" />
        </div>
      </div>

      {/* Timeline hours */}
      {HOURS.map((hour) => {
        const hourTasks = getTasksForHour(hour);
        const hourEvents = getEventsForHour(hour);
        const hourGhosts = getGhostsForHour(hour);
        return renderHourRow(hour, hourTasks, hourEvents, hourGhosts);
      })}
    </div>
  );

  // Render tomorrow's compact timeline content
  const renderTomorrowTimeline = () => (
    <div className="relative">
      {tomorrowHours.map((hour) => {
        const hourTasks = getTasksForHour(hour, tomorrowTasks);
        return renderHourRow(hour, hourTasks, [], [], { 
          isTomorrow: true
        });
      })}
      
      {/* Empty state if somehow we have no hours but have tasks */}
      {tomorrowHours.length === 0 && tomorrowTasks.length > 0 && (
        <div className="p-4 text-sm text-[hsl(var(--tomorrow-foreground)/0.7)]">
          Tasks scheduled for tomorrow
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-0 flex-grow md:overflow-hidden">
      {/* Desktop: Dual-pane layout */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Today's timeline */}
        <div
          ref={todayScrollRef}
          onScroll={hasTomorrowTasks ? handleTodayScroll : undefined}
          className={cn(
            "flex-1 overflow-y-auto scrollbar-hide",
            hasTomorrowTasks && "border-r border-border/30"
          )}
        >
          {/* DraftBar - sticky header for desktop (inside scroll container) */}
          {draftBarProps && (
            <DraftBar
              changesSummary={draftBarProps.changesSummary}
              onCancel={draftBarProps.onCancel}
              onReOptimize={draftBarProps.onReOptimize}
              onApply={draftBarProps.onApply}
              isProcessing={draftBarProps.isProcessing}
            />
          )}

          {/* Date header - sticky (only show in draft mode with tomorrow tasks) */}
          {hasTomorrowTasks && (
            <div className={cn(
              "sticky z-10 bg-card/95 backdrop-blur-sm px-4 py-2 border-b border-border/30",
              draftBarProps ? "top-[60px]" : "top-0"
            )}>
              <span className="text-sm font-semibold">Today · {formatDateHeader(currentDate)}</span>
            </div>
          )}

            {/* Today's timeline content */}
            <div className="pb-24">
              {renderTodayTimeline()}
            </div>
          </div>

          {/* Tomorrow's timeline (only when has tasks) */}
          {hasTomorrowTasks && (
            <div
              ref={tomorrowScrollRef}
              onScroll={handleTomorrowScroll}
              className="w-2/5 min-w-[280px] max-w-[420px] flex-shrink-0 overflow-y-auto scrollbar-hide bg-[hsl(var(--tomorrow)/0.3)]"
            >
              {/* Date header - sticky */}
              <div className="sticky top-0 z-10 bg-[hsl(var(--tomorrow)/0.8)] backdrop-blur-sm px-4 py-2 border-b border-[hsl(var(--tomorrow-foreground)/0.2)]">
                <span className="text-sm font-semibold text-[hsl(var(--tomorrow-foreground))]">
                  Tomorrow · {formatDateHeader(tomorrowDate)}
                </span>
              </div>

              {/* Tomorrow's compact timeline content */}
              <div className="pb-24">
                {renderTomorrowTimeline()}
              </div>
            </div>
          )}
      </div>

      {/* Mobile: Single timeline + tomorrow list below */}
      <div className="md:hidden h-0 flex-grow overflow-y-auto scrollbar-hide">
        {/* DraftBar - sticky header for mobile (inside scroll container) */}
        {draftBarProps && (
          <DraftBar
            changesSummary={draftBarProps.changesSummary}
            onCancel={draftBarProps.onCancel}
            onReOptimize={draftBarProps.onReOptimize}
            onApply={draftBarProps.onApply}
            isProcessing={draftBarProps.isProcessing}
          />
        )}

        {/* Date header (only show in draft mode with tomorrow tasks) */}
        {hasTomorrowTasks && (
          <div className={cn(
            "sticky z-10 bg-card/95 backdrop-blur-sm px-4 py-2 border-b border-border/30",
            draftBarProps ? "top-[60px]" : "top-0"
          )}>
            <span className="text-sm font-semibold">Today · {formatDateHeader(currentDate)}</span>
          </div>
        )}
        
        {/* Today's timeline (existing) */}
        <div className={hasTomorrowTasks ? "pb-8" : "pb-24"}>
          {renderTodayTimeline()}
        </div>
        
        {/* Tomorrow section */}
        {hasTomorrowTasks && (
          <div className="border-t border-border/30 bg-[hsl(var(--tomorrow)/0.3)] pb-24">
            <div className="sticky top-0 z-10 bg-[hsl(var(--tomorrow)/0.8)] backdrop-blur-sm px-4 py-2 border-b border-[hsl(var(--tomorrow-foreground)/0.2)]">
              <span className="text-sm font-semibold text-[hsl(var(--tomorrow-foreground))]">
                Tomorrow · {formatDateHeader(tomorrowDate)}
              </span>
            </div>
            <div className="p-3 space-y-2">
              {tomorrowTasks.map((task) => {
                const change = draftChanges?.get(task.id);
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={onToggleTask}
                    onDelete={onDeleteTask}
                    onDefer={onDeferTask}
                    onLockToggle={onLockToggle}
                    onEdit={onEditTask}
                    compact
                    hideActions={draftMode}
                    changeType={change?.type}
                    originalTime={change?.originalTime}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
