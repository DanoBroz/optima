/**
 * Modal for adding/editing tasks and events.
 * Thin wrapper composing TaskForm and EventForm components.
 */
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Task, CalendarEvent } from '@/types/task';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalBody,
  ResponsiveModalClose,
} from '@/components/ui/responsive-modal';
import { TaskForm } from '@/components/dashboard/forms/TaskForm';
import { EventForm } from '@/components/dashboard/forms/EventForm';

export type AddModalTab = 'task' | 'event';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Task callbacks
  onAddTask: (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  editTask?: Task | null;

  // Event callbacks
  onAddEvent: (event: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onUpdateEvent?: (id: string, updates: Partial<CalendarEvent>) => void;
  onDeleteEvent?: (id: string) => void;
  onDismissEvent?: (id: string) => void;
  editEvent?: CalendarEvent | null;

  // Shared
  selectedDate: Date;
  initialTab?: AddModalTab;
}

export function AddModal({
  isOpen,
  onClose,
  onAddTask,
  editTask,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onDismissEvent,
  editEvent,
  selectedDate,
  initialTab = 'task'
}: AddModalProps) {
  const [activeTab, setActiveTab] = useState<AddModalTab>(initialTab);

  // Determine edit mode
  const isTaskEditMode = !!editTask;
  const isEventEditMode = !!editEvent;
  const isExternalEvent = editEvent?.is_external ?? false;
  const isDismissedEvent = editEvent?.is_dismissed ?? false;

  // Reset tab based on initialTab when modal opens, or set based on edit mode
  useEffect(() => {
    if (isOpen) {
      if (editTask) {
        setActiveTab('task');
      } else if (editEvent) {
        setActiveTab('event');
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab, editTask, editEvent]);

  if (!isOpen) return null;

  // Determine header title
  const getHeaderTitle = () => {
    if (isTaskEditMode) return 'Edit Task';
    if (isDismissedEvent) return 'Skipped Event';
    if (isExternalEvent) return 'Edit Synced Event';
    if (isEventEditMode) return 'Edit Event';
    return null; // Will show tabs instead
  };

  const headerTitle = getHeaderTitle();

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent>
        {/* Header */}
        <ResponsiveModalHeader className="flex items-center justify-between">
          {headerTitle ? (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{headerTitle}</h2>
              {isExternalEvent && !isDismissedEvent && (
                <span className="px-2 py-0.5 text-[10px] bg-secondary rounded-full text-muted-foreground font-semibold">
                  Synced
                </span>
              )}
              {isDismissedEvent && (
                <span className="px-2 py-0.5 text-[10px] bg-secondary/50 rounded-full text-muted-foreground font-semibold">
                  Skipped
                </span>
              )}
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AddModalTab)}>
              <TabsList className="h-9 p-1 bg-secondary/50 rounded-xl">
                <TabsTrigger value="task" className="rounded-lg px-4 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  Task
                </TabsTrigger>
                <TabsTrigger value="event" className="rounded-lg px-4 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  Event
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <ResponsiveModalClose asChild>
            <button className="p-2 hover:bg-secondary rounded-xl transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </ResponsiveModalClose>
        </ResponsiveModalHeader>

        {/* Scrollable Body */}
        <ResponsiveModalBody>
          {activeTab === 'task' && (
            <TaskForm
              editTask={editTask}
              onSubmit={onAddTask}
              onClose={onClose}
              isOpen={isOpen}
            />
          )}

          {activeTab === 'event' && (
            <EventForm
              editEvent={editEvent}
              selectedDate={selectedDate}
              onSubmit={onAddEvent}
              onUpdate={onUpdateEvent}
              onDelete={onDeleteEvent}
              onDismiss={onDismissEvent}
              onClose={onClose}
              isOpen={isOpen}
            />
          )}
        </ResponsiveModalBody>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
