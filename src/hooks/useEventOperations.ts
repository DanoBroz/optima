/**
 * Event CRUD and sync operations hook.
 * Handles add, update, delete, import, clearExternal, applySyncChanges.
 */
import { useCallback } from 'react';
import type { CalendarEvent, SyncDiff, SyncSelections } from '@/types/task';
import { toast } from 'sonner';
import { eventRepository } from '@/data/eventRepository';
import { getDayTimeRange } from '@/utils/time';
import type { User } from '@supabase/supabase-js';

const createTimestamp = () => new Date().toISOString();

interface UseEventOperationsParams {
  user: User | null;
  dateStr: string;
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  fetchEvents: () => Promise<void>;
}

export function useEventOperations({
  user,
  dateStr,
  setEvents,
  fetchEvents,
}: UseEventOperationsParams) {
  const addEvent = useCallback(async (
    event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user) {
      toast.error('Please sign in to add events');
      return;
    }

    try {
      const timestamp = createTimestamp();
      const newEvent: CalendarEvent = {
        ...event,
        id: self.crypto.randomUUID(),
        user_id: user.id,
        created_at: timestamp,
        updated_at: timestamp,
      };

      await eventRepository.add(newEvent);
      setEvents(prev => [...prev, newEvent]);
      toast.success('Event added');
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    }
  }, [user, setEvents]);

  const updateEvent = useCallback(async (id: string, updates: Partial<CalendarEvent>) => {
    if (!user) {
      toast.error('Please sign in to update events');
      return;
    }

    try {
      await eventRepository.update(id, {
        ...updates,
        updated_at: createTimestamp(),
      });

      setEvents(prev => prev.map(event => (event.id === id ? { ...event, ...updates } : event)));
      toast.success('Event updated');
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  }, [user, setEvents]);

  const deleteEvent = useCallback(async (id: string) => {
    if (!user) {
      toast.error('Please sign in to delete events');
      return;
    }

    try {
      await eventRepository.remove(id);
      setEvents(prev => prev.filter(event => event.id !== id));
      toast.success('Event deleted');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  }, [user, setEvents]);

  const clearExternalEvents = useCallback(async (): Promise<number> => {
    if (!user) {
      toast.error('Please sign in to clear events');
      return 0;
    }

    try {
      const count = await eventRepository.clearExternal();
      setEvents(prev => prev.filter(event => !event.is_external));
      return count;
    } catch (error) {
      console.error('Error clearing external events:', error);
      toast.error('Failed to clear synced events');
      throw error;
    }
  }, [user, setEvents]);

  const importEvents = useCallback(async (
    eventsToImport: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[]
  ) => {
    if (!user) {
      toast.error('Please sign in to import events');
      return;
    }

    try {
      // Get existing external_ids to detect duplicates
      const existingIds = await eventRepository.getExistingExternalIds();

      // Filter out events that already exist (by external_id)
      const uniqueEvents = eventsToImport.filter(
        event => !event.external_id || !existingIds.has(event.external_id)
      );

      if (uniqueEvents.length === 0) {
        toast.info('All events already imported');
        return;
      }

      const timestamp = createTimestamp();
      const newEvents: CalendarEvent[] = uniqueEvents.map(event => ({
        ...event,
        id: self.crypto.randomUUID(),
        user_id: user.id,
        created_at: timestamp,
        updated_at: timestamp,
      }));

      await eventRepository.bulkAdd(newEvents);

      // Filter imported events by current date before adding to state
      const { startOfDay, endOfDay } = getDayTimeRange(dateStr);
      const startMs = new Date(startOfDay).getTime();
      const endMs = new Date(endOfDay).getTime();
      const filteredNewEvents = newEvents.filter(event => {
        const eventMs = new Date(event.start_time).getTime();
        return eventMs >= startMs && eventMs <= endMs;
      });

      setEvents(prev => [...prev, ...filteredNewEvents]);

      const skippedCount = eventsToImport.length - uniqueEvents.length;
      const message = skippedCount > 0
        ? `Imported ${newEvents.length} events (${skippedCount} duplicates skipped)`
        : `Imported ${newEvents.length} events`;
      toast.success(message);
    } catch (error) {
      console.error('Error importing events:', error);
      toast.error('Failed to import events');
      throw error;
    }
  }, [user, dateStr, setEvents]);

  const applySyncChanges = useCallback(async (
    syncDiff: SyncDiff,
    selections: SyncSelections
  ): Promise<{ added: number; updated: number; deleted: number }> => {
    if (!user) {
      toast.error('Please sign in to sync events');
      return { added: 0, updated: 0, deleted: 0 };
    }

    const timestamp = createTimestamp();
    const stats = { added: 0, updated: 0, deleted: 0 };

    try {
      // 1. Add new events
      const newEventsToAdd = syncDiff.newEvents
        .filter(change => selections.newIds.has(change.external_id))
        .map(change => ({
          ...change.newEvent!,
          id: self.crypto.randomUUID(),
          user_id: user.id,
          created_at: timestamp,
          updated_at: timestamp,
        })) as CalendarEvent[];

      if (newEventsToAdd.length > 0) {
        await eventRepository.bulkAdd(newEventsToAdd);
        stats.added = newEventsToAdd.length;
      }

      // 2. Update existing events
      const eventsToUpdate = syncDiff.updatedEvents
        .filter(change => selections.updateIds.has(change.external_id))
        .map(change => ({
          id: change.existingEvent!.id,
          updates: {
            title: change.updatedEvent!.title,
            start_time: change.updatedEvent!.start_time,
            end_time: change.updatedEvent!.end_time,
            location: change.updatedEvent!.location,
            updated_at: timestamp,
          },
        }));

      if (eventsToUpdate.length > 0) {
        await eventRepository.bulkUpdate(eventsToUpdate);
        stats.updated = eventsToUpdate.length;
      }

      // 3. Delete removed events
      const idsToDelete = syncDiff.deletedEvents
        .filter(change => selections.deleteIds.has(change.external_id))
        .map(change => change.deletedEvent!.id);

      if (idsToDelete.length > 0) {
        await eventRepository.bulkRemove(idsToDelete);
        stats.deleted = idsToDelete.length;
      }

      // Refresh events state to reflect all changes
      await fetchEvents();

      return stats;
    } catch (error) {
      console.error('Error applying sync changes:', error);
      toast.error('Failed to apply sync changes');
      throw error;
    }
  }, [user, fetchEvents]);

  return {
    addEvent,
    updateEvent,
    deleteEvent,
    clearExternalEvents,
    importEvents,
    applySyncChanges,
  };
}
