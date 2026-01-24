import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { Task, CalendarEvent } from '@/types/task';
import type { TaskChange, ChangesSummary } from '@/hooks/useDraft';
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { TaskCard } from './TaskCard';
import { SwipeableTaskCard } from './SwipeableTaskCard';
import { TaskActionDrawer } from './TaskActionDrawer';
import { GhostTaskCard } from './GhostTaskCard';
import { DraftBar } from './DraftBar';
import { PositionedTaskCard } from './PositionedTaskCard';
import { PositionedEventCard } from './PositionedEventCard';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  calculateTimelineLayout,
  PIXELS_PER_MINUTE,
  HOUR_ROW_HEIGHT,
  MIN_CARD_HEIGHT,
  pixelsToTime,
} from '@/utils/timelineLayout';

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

// Layout configuration for the two-lane timeline
const HOUR_LABEL_WIDTH = 48; // px
const LANE_GAP = 8; // px between event and task lanes
const TOTAL_HEIGHT = 24 * HOUR_ROW_HEIGHT; // Full 24 hours using compact row height

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
  const [drawerTask, setDrawerTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();
  const todayScrollRef = useRef<HTMLDivElement>(null);
  const tomorrowScrollRef = useRef<HTMLDivElement>(null);
  const nowIndicatorRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  const hasTomorrowTasks = tomorrowTasks && tomorrowTasks.length > 0;

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // Calculate current time indicator position (now simple math since we use fixed pixels per minute)
  const currentTimeTop = useMemo(() => {
    const minutesFromMidnight = currentHour * 60 + currentMinute;
    return minutesFromMidnight * PIXELS_PER_MINUTE;
  }, [currentHour, currentMinute]);

  // Calculate layout for tasks and events with overlap detection
  const todayLayout = useMemo(() => {
    return calculateTimelineLayout(tasks, events);
  }, [tasks, events]);

  // Dynamic lane proportions based on content presence
  const hasEvents = todayLayout.events.length > 0;
  const hasTasks = todayLayout.tasks.length > 0;

  // Create lookup maps for quick access to items by ID
  const tasksMap = useMemo(() => {
    return new Map(tasks.map(t => [t.id, t]));
  }, [tasks]);

  const eventsMap = useMemo(() => {
    return new Map(events.map(e => [e.id, e]));
  }, [events]);

  // State for drag-and-drop with dnd-kit
  const [dropIndicatorY, setDropIndicatorY] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<number>(0); // Offset from card top to grab point

  // dnd-kit sensors - use PointerSensor for both mouse and touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
    })
  );

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to current time indicator on mount
  useEffect(() => {
    if (nowIndicatorRef.current && todayScrollRef.current && currentTimeTop > 0) {
      nowIndicatorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTimeTop]);

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

  // Helper for tomorrow timeline (still uses hour-based grouping)
  const getTasksForHour = useCallback((hour: number, taskList: Task[] = tasks) => {
    return taskList.filter((task) => {
      if (!task.scheduled_time) return false;
      const taskHour = parseInt(task.scheduled_time.split(':')[0], 10);
      return taskHour === hour;
    });
  }, [tasks]);

  // dnd-kit drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;

    // Store the offset from the card's top to the grab point
    const cardTop = active.data.current?.cardTop as number | undefined;
    if (cardTop !== undefined && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const initialY = (event.activatorEvent as PointerEvent).clientY;
      const mouseY = initialY - rect.top + (todayScrollRef.current?.scrollTop ?? 0);
      dragOffsetRef.current = mouseY - cardTop;
    }
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Get the current pointer position
    const pointerY = (event.activatorEvent as PointerEvent).clientY + event.delta.y;
    const y = pointerY - rect.top + (todayScrollRef.current?.scrollTop ?? 0);

    // Subtract offset so indicator shows where card's TOP will land
    const adjustedY = y - dragOffsetRef.current;
    // Snap to 15-minute intervals for visual feedback
    const minutes = Math.round(adjustedY / PIXELS_PER_MINUTE / 15) * 15;
    const clampedMinutes = Math.max(0, Math.min(minutes, 24 * 60 - 15)); // Clamp to valid range
    setDropIndicatorY(clampedMinutes * PIXELS_PER_MINUTE);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active } = event;
    const taskId = active.id as string;

    if (dropIndicatorY !== null) {
      const time = pixelsToTime(dropIndicatorY, true, 15);
      onRescheduleTask(taskId, time);
    }

    setDropIndicatorY(null);
    dragOffsetRef.current = 0;
  }, [dropIndicatorY, onRescheduleTask]);

  const handleDragCancel = useCallback(() => {
    setDropIndicatorY(null);
    dragOffsetRef.current = 0;
  }, []);

  // Render a single hour row for the tomorrow timeline (simplified, no drag-drop)
  const renderTomorrowHourRow = (hour: number, hourTasks: Task[]) => {
    return (
      <div
        key={hour}
        className="relative flex min-h-[56px] border-b border-[hsl(var(--tomorrow-foreground)/0.1)]"
      >
        {/* Hour label */}
        <div className="w-12 flex-shrink-0 py-2 px-2">
          <span className="text-[11px] font-medium tabular-nums text-[hsl(var(--tomorrow-foreground)/0.7)]">
            {formatHour(hour)}
          </span>
        </div>

        {/* Timeline line */}
        <div className="absolute left-12 top-0 bottom-0 w-px bg-[hsl(var(--tomorrow-foreground)/0.15)]" />

        {/* Tasks for this hour */}
        <div className="flex-1 py-1.5 pl-3 pr-2">
          {hourTasks.length > 0 && (
            <div className="space-y-1.5">
              {hourTasks.map((task, index) => {
                const change = draftMode ? draftChanges?.get(task.id) : undefined;

                // Mobile: Use swipeable card with tap-to-open drawer
                if (isMobile) {
                  return (
                    <div
                      key={task.id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <SwipeableTaskCard
                        task={task}
                        onToggle={onToggleTask}
                        onDelete={onDeleteTask}
                        onDefer={onDeferTask}
                        onLockToggle={onLockToggle}
                        onEdit={onEditTask}
                        onTap={() => {
                          setDrawerTask(task);
                          setDrawerOpen(true);
                        }}
                        compact
                        hideActions={draftMode}
                        changeType={change?.type}
                        originalTime={change?.originalTime}
                      />
                    </div>
                  );
                }

                // Desktop: Standard card (no drag on tomorrow)
                return (
                  <div
                    key={task.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TaskCard
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render today's timeline content with absolute positioning
  const renderTodayTimeline = () => (
    <div
      ref={timelineRef}
      className="relative"
      style={{ height: `${TOTAL_HEIGHT}px` }}
    >
      {/* Hour grid lines and labels - fixed compact height */}
      {HOURS.map((hour) => {
        const top = hour * HOUR_ROW_HEIGHT;
        const isWorkHour = hour >= WORK_HOURS_START && hour < WORK_HOURS_END;
        const isPast = hour < currentHour;
        const isCurrent = hour === currentHour;

        return (
          <div
            key={hour}
            className={cn(
              "absolute left-0 right-0 border-b border-border/30",
              !isWorkHour && "bg-secondary/20",
              isPast && "opacity-65"
            )}
            style={{
              top: `${top}px`,
              height: `${HOUR_ROW_HEIGHT}px`,
            }}
          >
            {/* Hour label */}
            <span
              className={cn(
                "absolute left-2 top-1 text-[11px] font-medium tabular-nums",
                isCurrent ? "text-primary" : "text-muted-foreground"
              )}
            >
              {formatHour(hour)}
            </span>
          </div>
        );
      })}

      {/* Vertical divider line (after hour labels) */}
      <div
        className="absolute top-0 bottom-0 w-px bg-border/50"
        style={{ left: `${HOUR_LABEL_WIDTH}px` }}
      />

      {/* Drop indicator line */}
      {dropIndicatorY !== null && (
        <div
          className="absolute left-12 right-0 h-0.5 bg-primary z-20 pointer-events-none"
          style={{ top: `${dropIndicatorY}px` }}
        />
      )}

      {/* Current time indicator */}
      <div
        ref={nowIndicatorRef}
        className="absolute left-0 right-0 z-10 pointer-events-none"
        style={{ top: `${currentTimeTop}px` }}
      >
        <div className="flex items-center">
          <div className="w-12 flex-shrink-0" />
          <div className="relative -ml-[5px]">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-primary pulse-ring" />
          </div>
          <div className="flex-1 h-[2px] bg-primary rounded-full ml-1" />
        </div>
      </div>

      {/* Events lane (left side of content area) - only if has events */}
      {hasEvents && (
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: `${HOUR_LABEL_WIDTH + LANE_GAP}px`,
            // If no tasks, events get full width; otherwise 50%
            width: hasTasks
              ? `calc((100% - ${HOUR_LABEL_WIDTH + LANE_GAP * 3}px) * 0.5)`
              : `calc(100% - ${HOUR_LABEL_WIDTH + LANE_GAP * 2}px)`,
          }}
        >
          {todayLayout.events.map((layout) => {
            const event = eventsMap.get(layout.id);
            if (!event) return null;
            return (
              <PositionedEventCard
                key={layout.id}
                layout={layout}
                event={event}
                onClick={onEventClick ? () => onEventClick(event) : undefined}
                onRestore={onRestoreEvent ? () => onRestoreEvent(event.id) : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Tasks lane (right side of content area, or full width if no events) */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          // If no events, start from hour label; otherwise start after events lane
          left: hasEvents
            ? `calc(${HOUR_LABEL_WIDTH + LANE_GAP}px + (100% - ${HOUR_LABEL_WIDTH + LANE_GAP * 3}px) * 0.5 + ${LANE_GAP}px)`
            : `${HOUR_LABEL_WIDTH + LANE_GAP}px`,
          right: `${LANE_GAP}px`,
        }}
      >
        {/* Ghost tasks for draft mode */}
        {draftMode && ghostTasks.map((ghost) => {
          const startMinutes = parseInt(ghost.originalTime.split(':')[0], 10) * 60 +
            parseInt(ghost.originalTime.split(':')[1] || '0', 10);
          const duration = ghost.task.duration || 30;
          const top = startMinutes * PIXELS_PER_MINUTE;
          const height = Math.max(MIN_CARD_HEIGHT, duration * PIXELS_PER_MINUTE);

          return (
            <div
              key={`ghost-${ghost.task.id}`}
              className="absolute left-0 right-0 px-0.5"
              style={{ top: `${top}px`, height: `${height}px` }}
            >
              <GhostTaskCard
                task={ghost.task}
                originalTime={ghost.originalTime}
              />
            </div>
          );
        })}

        {/* Positioned tasks */}
        {todayLayout.tasks.map((layout) => {
          const task = tasksMap.get(layout.id);
          if (!task) return null;
          const change = draftMode ? draftChanges?.get(task.id) : undefined;

          return (
            <PositionedTaskCard
              key={layout.id}
              layout={layout}
              task={task}
              onToggle={onToggleTask}
              onDelete={onDeleteTask}
              onDefer={onDeferTask}
              onLockToggle={onLockToggle}
              onMoveToBacklog={onMoveToBacklog}
              onEdit={onEditTask}
              onTap={() => {
                setDrawerTask(task);
                setDrawerOpen(true);
              }}
              hideActions={draftMode}
              changeType={change?.type}
              originalTime={change?.originalTime}
              draggable={!draftMode && !isMobile}
            />
          );
        })}
      </div>
    </div>
  );

  // Render tomorrow's compact timeline content
  const renderTomorrowTimeline = () => (
    <div className="relative">
      {tomorrowHours.map((hour) => {
        const hourTasks = getTasksForHour(hour, tomorrowTasks);
        return renderTomorrowHourRow(hour, hourTasks);
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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col flex-1 min-h-0 md:overflow-hidden">
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
      <div className="md:hidden">
        {/* DraftBar is now shown in DraftActionBar at bottom on mobile */}

        {/* Date header (only show in draft mode with tomorrow tasks) */}
        {hasTomorrowTasks && (
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm px-4 py-2 border-b border-border/30">
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
                  <SwipeableTaskCard
                    key={task.id}
                    task={task}
                    onToggle={onToggleTask}
                    onDelete={onDeleteTask}
                    onDefer={onDeferTask}
                    onLockToggle={onLockToggle}
                    onEdit={onEditTask}
                    onTap={() => {
                      setDrawerTask(task);
                      setDrawerOpen(true);
                    }}
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

        {/* Task action drawer for mobile */}
        <TaskActionDrawer
          task={drawerTask}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onToggle={onToggleTask}
          onDelete={onDeleteTask}
          onDefer={onDeferTask}
          onLockToggle={onLockToggle}
          onMoveToBacklog={onMoveToBacklog}
          onEdit={onEditTask}
        />
      </div>
    </DndContext>
  );
}
