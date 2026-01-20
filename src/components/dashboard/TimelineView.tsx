import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task, CalendarEvent } from '@/types/task';
import { TaskCard } from './TaskCard';
import { EventCard } from './EventCard';
import { cn } from '@/lib/utils';

interface TimelineViewProps {
  tasks: Task[];
  events: CalendarEvent[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onDeferTask: (id: string) => void;
  onRescheduleTask: (id: string, time: string) => void;
  onLockToggle: (id: string) => void;
  onMoveToBacklog?: (id: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WORK_HOURS_START = 6;
const WORK_HOURS_END = 22;

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
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
  onEventClick
}: TimelineViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [nowPositionPx, setNowPositionPx] = useState<number>(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const nowIndicatorRef = useRef<HTMLDivElement>(null);
  const hourRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (nowIndicatorRef.current) {
      nowIndicatorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, []);

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // Calculate the indicator position using actual DOM measurements
  const calculateNowPosition = useCallback(() => {
    const hourBlock = hourRefs.current[currentHour];
    if (!hourBlock) return;

    const blockTop = hourBlock.offsetTop;
    const blockHeight = hourBlock.offsetHeight;
    const minuteOffset = (currentMinute / 60) * blockHeight;

    setNowPositionPx(blockTop + minuteOffset);
  }, [currentHour, currentMinute]);

  // Recalculate position when time changes
  useEffect(() => {
    calculateNowPosition();
  }, [calculateNowPosition]);

  // Recalculate after DOM updates (tasks/events change block heights)
  useEffect(() => {
    const timer = setTimeout(calculateNowPosition, 0);
    return () => clearTimeout(timer);
  }, [tasks, events, calculateNowPosition]);

  const getTasksForHour = (hour: number) => {
    return tasks.filter((task) => {
      if (!task.scheduled_time) return false;
      const taskHour = parseInt(task.scheduled_time.split(':')[0], 10);
      return taskHour === hour;
    });
  };

  const getEventsForHour = (hour: number) => {
    return events.filter((event) => {
      const eventHour = new Date(event.start_time).getHours();
      return eventHour === hour;
    });
  };

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

  return (
    <div 
      ref={timelineRef}
      className="relative flex-1 overflow-y-auto scrollbar-hide pb-24"
    >
      {/* Current time indicator */}
      <div
        ref={nowIndicatorRef}
        className="absolute left-0 right-0 z-10 pointer-events-none"
        style={{ top: `${nowPositionPx}px` }}
      >
        <div className="flex items-center gap-2 px-2">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-primary pulse-ring" />
          </div>
          <div className="flex-1 h-[2px] bg-primary rounded-full" />
        </div>
      </div>

      {/* Timeline hours */}
      <div className="relative">
        {HOURS.map((hour) => {
          const hourTasks = getTasksForHour(hour);
          const hourEvents = getEventsForHour(hour);
          const isWorkHour = hour >= WORK_HOURS_START && hour < WORK_HOURS_END;
          const isPast = hour < currentHour;
          const isCurrent = hour === currentHour;
          const isDragOver = dragOverHour === hour;

          return (
            <div
              key={hour}
              ref={(el) => { hourRefs.current[hour] = el; }}
              className={cn(
                "relative flex min-h-[56px] border-b border-border/30 transition-colors",
                !isWorkHour && "bg-secondary/20",
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
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {formatHour(hour)}
                </span>
              </div>

              {/* Timeline line */}
              <div className="absolute left-12 top-0 bottom-0 w-px bg-border/50" />

              {/* Events and tasks for this hour */}
              <div className="flex-1 py-1.5 pl-3 pr-2 space-y-1.5">
                {/* Calendar events (locked) */}
                {hourEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={onEventClick ? () => onEventClick(event) : undefined}
                  />
                ))}

                {/* Tasks */}
                {hourTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                    draggable
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
                      onMoveToBacklog={onMoveToBacklog}
                      compact
                      draggable
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
