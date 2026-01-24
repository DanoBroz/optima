/**
 * Modal Orchestration Hook
 * ========================
 *
 * Centralizes management of all modal states in the dashboard.
 * Extracted from Index.tsx to improve maintainability and testability.
 *
 * ## Modals Managed
 *
 * - AddModal: Create/edit tasks and events
 * - SyncCalendarModal: Import events from ICS files
 * - SettingsModal: User preferences
 * - PastTimeConflictModal: Handle scheduling in past time
 * - NoSlotModal: Handle tasks that couldn't be scheduled
 *
 * ## Usage
 *
 * ```tsx
 * const { modals, editing, pending, actions } = useModalOrchestration();
 *
 * // Open add modal for new task
 * actions.openAddModal('task');
 *
 * // Edit existing task
 * actions.openEditTask(task);
 *
 * // Check modal state
 * if (modals.isAddModalOpen) { ... }
 * ```
 */

import { useState, useCallback } from 'react';
import type { CalendarEvent, Task } from '@/types/task';
import type { AddModalTab } from '@/components/dashboard/AddModal';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Task data pending conflict resolution */
export interface PendingTask {
  task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
  attemptedTime: string;
}

/** Modal visibility states */
export interface ModalStates {
  isAddModalOpen: boolean;
  isSyncModalOpen: boolean;
  isSettingsModalOpen: boolean;
  addModalInitialTab: AddModalTab;
}

/** Items currently being edited */
export interface EditingState {
  event: CalendarEvent | null;
  task: Task | null;
}

/** Pending states requiring user resolution */
export interface PendingState {
  task: PendingTask | null;
  unscheduledTasks: Task[];
  dateChange: Date | null;
}

/** Actions to control modals */
export interface ModalActions {
  // Add Modal
  openAddModal: (tab?: AddModalTab) => void;
  closeAddModal: () => void;

  // Edit modes
  openEditTask: (task: Task) => void;
  openEditEvent: (event: CalendarEvent) => void;

  // Sync Modal
  openSyncModal: () => void;
  closeSyncModal: () => void;

  // Settings Modal
  openSettingsModal: () => void;
  closeSettingsModal: () => void;

  // Pending states
  setPendingTask: (pending: PendingTask | null) => void;
  setPendingUnscheduledTasks: (tasks: Task[]) => void;
  setPendingDateChange: (date: Date | null) => void;

  // Clear editing states
  clearEditing: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useModalOrchestration() {
  // Modal visibility states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialTab, setAddModalInitialTab] = useState<AddModalTab>('task');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Editing states
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Pending states requiring resolution
  const [pendingTask, setPendingTask] = useState<PendingTask | null>(null);
  const [pendingUnscheduledTasks, setPendingUnscheduledTasks] = useState<Task[]>([]);
  const [pendingDateChange, setPendingDateChange] = useState<Date | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Add Modal Actions
  // ─────────────────────────────────────────────────────────────────────────────

  const openAddModal = useCallback((tab: AddModalTab = 'task') => {
    setAddModalInitialTab(tab);
    setIsAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
    setEditingEvent(null);
    setEditingTask(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Edit Actions
  // ─────────────────────────────────────────────────────────────────────────────

  const openEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setAddModalInitialTab('task');
    setIsAddModalOpen(true);
  }, []);

  const openEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setAddModalInitialTab('event');
    setIsAddModalOpen(true);
  }, []);

  const clearEditing = useCallback(() => {
    setEditingEvent(null);
    setEditingTask(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Sync Modal Actions
  // ─────────────────────────────────────────────────────────────────────────────

  const openSyncModal = useCallback(() => {
    setIsSyncModalOpen(true);
  }, []);

  const closeSyncModal = useCallback(() => {
    setIsSyncModalOpen(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Settings Modal Actions
  // ─────────────────────────────────────────────────────────────────────────────

  const openSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  const closeSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Return structured state and actions
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    // Modal states
    modals: {
      isAddModalOpen,
      isSyncModalOpen,
      isSettingsModalOpen,
      addModalInitialTab,
    } as ModalStates,

    // Editing states
    editing: {
      event: editingEvent,
      task: editingTask,
    } as EditingState,

    // Pending states
    pending: {
      task: pendingTask,
      unscheduledTasks: pendingUnscheduledTasks,
      dateChange: pendingDateChange,
    } as PendingState,

    // Actions
    actions: {
      openAddModal,
      closeAddModal,
      openEditTask,
      openEditEvent,
      openSyncModal,
      closeSyncModal,
      openSettingsModal,
      closeSettingsModal,
      setPendingTask,
      setPendingUnscheduledTasks,
      setPendingDateChange,
      clearEditing,
    } as ModalActions,
  };
}
