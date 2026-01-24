/**
 * Draft Mode Hook
 * ===============
 *
 * Manages the "preview before commit" workflow for schedule optimization.
 * When users click "Optimize", changes aren't saved immediately — instead,
 * they enter draft mode where they can review, adjust, and either apply or
 * cancel the proposed changes.
 *
 * ## State Machine
 *
 * ```
 *                    ┌──────────────────────────────────────────┐
 *                    │                                          │
 *                    ▼                                          │
 *              ┌──────────┐                                     │
 *              │ INACTIVE │ ◄─────────────────────────────┐     │
 *              └────┬─────┘                               │     │
 *                   │                                     │     │
 *                   │ startDraft()                        │     │
 *                   ▼                                     │     │
 *              ┌──────────┐                               │     │
 *      ┌──────►│  ACTIVE  │◄──────────────────────┐       │     │
 *      │       └────┬─────┘                       │       │     │
 *      │            │                             │       │     │
 *      │            ├── updateProposedTime()      │       │     │
 *      │            ├── scheduleUnscheduled()     │       │     │
 *      │            ├── toggleDraftLock()         │       │     │
 *      │            └── removeFromDraft()         │       │     │
 *      │                                          │       │     │
 *      │       reOptimize()                       │       │     │
 *      │       (recalculates)                     │       │     │
 *      │            │                             │       │     │
 *      └────────────┘                             │       │     │
 *                                                 │       │     │
 *                   ├── applyDraft() ─────► APPLYING ─────┘     │
 *                   │                        │                  │
 *                   │                        │ (saves to DB)    │
 *                   │                        ▼                  │
 *                   │                   ┌──────────┐            │
 *                   │                   │ INACTIVE │            │
 *                   │                   └──────────┘            │
 *                   │                                           │
 *                   └── cancelDraft() ──────────────────────────┘
 * ```
 *
 * ## Data Flow
 *
 * ```
 * User clicks "Optimize"
 *         │
 *         ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │ startDraft(originalTasks, proposedTasks, unscheduledTasks)  │
 * │                                                             │
 * │   originalTasks ──► stored for comparison & revert          │
 * │   proposedTasks ──► shown on timeline with change badges    │
 * │   unscheduledTasks ──► shown in "couldn't fit" list         │
 * │                                                             │
 * │   changes Map ──► tracks 'moved' | 'new' | 'unchanged'      │
 * │   ghostTasks ──► faded cards at original positions          │
 * └─────────────────────────────────────────────────────────────┘
 *         │
 *         ▼
 * User reviews timeline (proposed positions shown)
 * User can:
 *   - Drag tasks to adjust times ──► updateProposedTime()
 *   - Lock tasks to preserve position ──► toggleDraftLock()
 *   - Manually schedule unscheduled ──► scheduleUnscheduled()
 *   - Re-optimize respecting locks ──► reOptimize()
 *         │
 *         ▼
 * User clicks "Apply" or "Cancel"
 *   - Apply ──► saves proposedTasks to database
 *   - Cancel ──► discards all changes, reverts to original
 * ```
 *
 * ## Ghost Tasks
 *
 * When a task is moved, a "ghost" card appears at its original position
 * to help users visualize the change. Ghost tasks are computed from the
 * changes Map by filtering for 'moved' type with an originalTime.
 *
 * ## Change Types
 *
 * - `moved`: Task time changed (was scheduled, moved to different time)
 * - `new`: Task newly scheduled (was in backlog, now has time)
 * - `unchanged`: Task kept same time (no optimization needed)
 * - `removed`: Task removed from draft (reverted to original state)
 *
 * @module useDraft
 */

import { useState, useCallback, useMemo } from 'react';
import type { Task, CalendarEvent, DailyEnergyLevel } from '@/types/task';
import { scheduleService } from '@/services/scheduleService';
import { format, addDays, parse } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Type of change for a task in draft mode */
export type TaskChangeType = 'moved' | 'new' | 'unchanged' | 'removed';

export interface TaskChange {
  type: TaskChangeType;
  originalTime?: string | null;
  originalDate?: string | null;
}

export interface DraftState {
  isActive: boolean;
  originalTasks: Task[];
  proposedTasks: Task[];
  unscheduledTasks: Task[];
  changes: Map<string, TaskChange>;
}

export interface ChangesSummary {
  moved: number;
  new: number;
  unchanged: number;
  unscheduled: number;
  scheduledTomorrow: number;
  total: number;
}

interface UseDraftProps {
  events: CalendarEvent[];
  dailyEnergy: DailyEnergyLevel;
  dateStr: string;
  allTasks: Task[];
  onApply: (tasks: Task[]) => Promise<void>;
}

export function useDraft({ events, dailyEnergy, dateStr, allTasks, onApply }: UseDraftProps) {
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Calculate change type for a task by comparing original vs proposed
   */
  const calculateChanges = useCallback((
    originalTasks: Task[],
    proposedTasks: Task[]
  ): Map<string, TaskChange> => {
    const changes = new Map<string, TaskChange>();
    const originalMap = new Map(originalTasks.map(t => [t.id, t]));

    for (const proposed of proposedTasks) {
      const original = originalMap.get(proposed.id);
      
      if (!original) {
        // Task wasn't in original set (shouldn't happen normally)
        changes.set(proposed.id, { type: 'new' });
      } else if (!original.scheduled_time && proposed.scheduled_time) {
        // Was unscheduled (backlog), now scheduled
        changes.set(proposed.id, { 
          type: 'new',
          originalTime: null,
          originalDate: original.scheduled_date,
        });
      } else if (original.scheduled_time !== proposed.scheduled_time) {
        // Time changed
        changes.set(proposed.id, { 
          type: 'moved',
          originalTime: original.scheduled_time,
          originalDate: original.scheduled_date,
        });
      } else {
        // No change
        changes.set(proposed.id, { type: 'unchanged' });
      }
    }

    return changes;
  }, []);

  /**
   * Start draft mode with proposed optimization results
   */
  const startDraft = useCallback((
    originalTasks: Task[],
    proposedTasks: Task[],
    unscheduledTasks: Task[]
  ) => {
    const changes = calculateChanges(originalTasks, proposedTasks);
    
    setDraftState({
      isActive: true,
      originalTasks,
      proposedTasks,
      unscheduledTasks,
      changes,
    });
  }, [calculateChanges]);

  /**
   * Update a task's proposed scheduled time
   */
  const updateProposedTime = useCallback((taskId: string, newTime: string) => {
    if (!draftState) return;

    setDraftState(prev => {
      if (!prev) return prev;

      const updatedProposed = prev.proposedTasks.map(task =>
        task.id === taskId
          ? { ...task, scheduled_time: newTime, is_locked: true }
          : task
      );

      // Recalculate changes for this task
      const updatedChanges = new Map(prev.changes);
      const original = prev.originalTasks.find(t => t.id === taskId);
      const proposed = updatedProposed.find(t => t.id === taskId);

      if (original && proposed) {
        if (!original.scheduled_time && proposed.scheduled_time) {
          updatedChanges.set(taskId, { type: 'new', originalTime: null });
        } else if (original.scheduled_time !== proposed.scheduled_time) {
          updatedChanges.set(taskId, { 
            type: 'moved', 
            originalTime: original.scheduled_time,
            originalDate: original.scheduled_date,
          });
        } else {
          updatedChanges.set(taskId, { type: 'unchanged' });
        }
      }

      return {
        ...prev,
        proposedTasks: updatedProposed,
        changes: updatedChanges,
      };
    });
  }, [draftState]);

  /**
   * Remove a task from the draft (revert to original state)
   */
  const removeFromDraft = useCallback((taskId: string) => {
    if (!draftState) return;

    setDraftState(prev => {
      if (!prev) return prev;

      const original = prev.originalTasks.find(t => t.id === taskId);
      
      // Remove from proposed and add back to unscheduled if it was from backlog
      const updatedProposed = prev.proposedTasks.filter(t => t.id !== taskId);
      const updatedChanges = new Map(prev.changes);
      updatedChanges.delete(taskId);

      // If the task was originally unscheduled, add it back to unscheduled
      let updatedUnscheduled = prev.unscheduledTasks;
      if (original && !original.scheduled_time) {
        updatedUnscheduled = [...prev.unscheduledTasks, original];
      }

      return {
        ...prev,
        proposedTasks: updatedProposed,
        unscheduledTasks: updatedUnscheduled,
        changes: updatedChanges,
      };
    });
  }, [draftState]);

  /**
   * Manually schedule an unscheduled task
   */
  const scheduleUnscheduled = useCallback((taskId: string, time: string) => {
    if (!draftState) return;

    setDraftState(prev => {
      if (!prev) return prev;

      const taskToSchedule = prev.unscheduledTasks.find(t => t.id === taskId);
      if (!taskToSchedule) return prev;

      const scheduledTask: Task = {
        ...taskToSchedule,
        scheduled_time: time,
        scheduled_date: dateStr,
        is_locked: true,
      };

      const updatedProposed = [...prev.proposedTasks, scheduledTask];
      const updatedUnscheduled = prev.unscheduledTasks.filter(t => t.id !== taskId);
      const updatedChanges = new Map(prev.changes);
      updatedChanges.set(taskId, { type: 'new', originalTime: null });

      return {
        ...prev,
        proposedTasks: updatedProposed,
        unscheduledTasks: updatedUnscheduled,
        changes: updatedChanges,
      };
    });
  }, [draftState, dateStr]);

  /**
   * Toggle lock state in draft
   */
  const toggleDraftLock = useCallback((taskId: string) => {
    if (!draftState) return;

    setDraftState(prev => {
      if (!prev) return prev;

      const updatedProposed = prev.proposedTasks.map(task =>
        task.id === taskId ? { ...task, is_locked: !task.is_locked } : task
      );

      return {
        ...prev,
        proposedTasks: updatedProposed,
      };
    });
  }, [draftState]);

  /**
   * Re-run optimization with current draft state
   */
  const reOptimize = useCallback(async () => {
    if (!draftState) return;

    setIsProcessing(true);
    try {
      // Combine current proposed + unscheduled for re-optimization
      // But keep locked tasks fixed
      const lockedTasks = draftState.proposedTasks.filter(t => t.is_locked);
      const unlockedTasks = draftState.proposedTasks.filter(t => !t.is_locked);
      const tasksToOptimize = [...unlockedTasks, ...draftState.unscheduledTasks];

      // Re-run the scheduling algorithm
      // We need to simulate having the locked tasks in the "all tasks" pool
      const simulatedAllTasks = [
        ...allTasks.filter(t => !tasksToOptimize.some(opt => opt.id === t.id) && !lockedTasks.some(l => l.id === t.id)),
        ...lockedTasks, // Keep locked as-is
        ...tasksToOptimize.map(t => ({ ...t, scheduled_time: null, scheduled_date: null })), // Reset for re-scheduling
      ];

      const newlyScheduled = scheduleService.autoScheduleAllUnlocked(
        simulatedAllTasks,
        events,
        dailyEnergy,
        dateStr
      );

      // Determine which tasks got scheduled and which didn't
      const scheduledIds = new Set(newlyScheduled.map(t => t.id));
      const stillUnscheduled = tasksToOptimize.filter(t => !scheduledIds.has(t.id));

      // Combine locked tasks with newly scheduled
      const newProposed = [...lockedTasks, ...newlyScheduled];
      const newChanges = calculateChanges(draftState.originalTasks, newProposed);

      setDraftState(prev => prev ? {
        ...prev,
        proposedTasks: newProposed,
        unscheduledTasks: stillUnscheduled,
        changes: newChanges,
      } : prev);
    } finally {
      setIsProcessing(false);
    }
  }, [draftState, allTasks, events, dailyEnergy, dateStr, calculateChanges]);

  /**
   * Apply the draft changes (save to database)
   */
  const applyDraft = useCallback(async () => {
    if (!draftState || draftState.proposedTasks.length === 0) return;

    setIsProcessing(true);
    try {
      await onApply(draftState.proposedTasks);
      setDraftState(null);
    } finally {
      setIsProcessing(false);
    }
  }, [draftState, onApply]);

  /**
   * Cancel draft mode without applying changes
   */
  const cancelDraft = useCallback(() => {
    setDraftState(null);
  }, []);

  /**
   * Compute tomorrow's date string
   */
  const tomorrowDateStr = useMemo(() => {
    const tomorrow = addDays(parse(dateStr, 'yyyy-MM-dd', new Date()), 1);
    return format(tomorrow, 'yyyy-MM-dd');
  }, [dateStr]);

  /**
   * Split proposed tasks by date (today vs tomorrow)
   */
  const todayTasks = useMemo(() => {
    if (!draftState) return [];
    return draftState.proposedTasks.filter(t => t.scheduled_date === dateStr);
  }, [draftState, dateStr]);

  const tomorrowTasks = useMemo(() => {
    if (!draftState) return [];
    return draftState.proposedTasks.filter(t => t.scheduled_date === tomorrowDateStr);
  }, [draftState, tomorrowDateStr]);

  /**
   * Get a summary of changes
   */
  const changesSummary = useMemo((): ChangesSummary => {
    if (!draftState) {
      return { moved: 0, new: 0, unchanged: 0, unscheduled: 0, scheduledTomorrow: 0, total: 0 };
    }

    let moved = 0;
    let newCount = 0;
    let unchanged = 0;

    for (const change of draftState.changes.values()) {
      switch (change.type) {
        case 'moved':
          moved++;
          break;
        case 'new':
          newCount++;
          break;
        case 'unchanged':
          unchanged++;
          break;
      }
    }

    // Count tasks scheduled for tomorrow
    const scheduledTomorrow = draftState.proposedTasks.filter(
      t => t.scheduled_date === tomorrowDateStr
    ).length;

    return {
      moved,
      new: newCount,
      unchanged,
      unscheduled: draftState.unscheduledTasks.length,
      scheduledTomorrow,
      total: moved + newCount,
    };
  }, [draftState, tomorrowDateStr]);

  /**
   * Check if there are any actual changes in the draft
   */
  const hasChanges = useMemo(() => {
    if (!draftState) return false;
    return changesSummary.moved > 0 || changesSummary.new > 0;
  }, [draftState, changesSummary]);

  /**
   * Get the change info for a specific task
   */
  const getTaskChange = useCallback((taskId: string): TaskChange | undefined => {
    return draftState?.changes.get(taskId);
  }, [draftState]);

  /**
   * Get ghost tasks (original positions for moved tasks)
   */
  const ghostTasks = useMemo((): Array<{ task: Task; originalTime: string }> => {
    if (!draftState) return [];

    const ghosts: Array<{ task: Task; originalTime: string }> = [];
    
    for (const [taskId, change] of draftState.changes.entries()) {
      if (change.type === 'moved' && change.originalTime) {
        const task = draftState.proposedTasks.find(t => t.id === taskId);
        if (task) {
          ghosts.push({ task, originalTime: change.originalTime });
        }
      }
    }

    return ghosts;
  }, [draftState]);

  return {
    // State
    draftState,
    isActive: draftState?.isActive ?? false,
    isProcessing,
    
    // Computed
    changesSummary,
    hasChanges,
    ghostTasks,
    todayTasks,
    tomorrowTasks,
    tomorrowDateStr,
    
    // Actions
    startDraft,
    updateProposedTime,
    removeFromDraft,
    scheduleUnscheduled,
    toggleDraftLock,
    reOptimize,
    applyDraft,
    cancelDraft,
    getTaskChange,
  };
}
