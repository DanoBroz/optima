/**
 * Dashboard context providing task and event actions to deeply nested components.
 * Eliminates prop drilling through TimelineView → PositionedTaskCard → TaskCard chains.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { CalendarEvent } from '@/types/task';

/** Task action callbacks available via context */
export interface DashboardTaskActions {
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDefer: (id: string) => void;
  onReschedule: (id: string, time: string) => void;
  onLockToggle: (id: string) => void;
  onMoveToBacklog: (id: string) => void;
  onScheduleToToday: (id: string) => void;
  onEdit: (id: string) => void;
}

/** Event action callbacks available via context */
export interface DashboardEventActions {
  onClick: (event: CalendarEvent) => void;
  onRestore: (id: string) => void;
}

interface DashboardContextValue {
  taskActions: DashboardTaskActions;
  eventActions: DashboardEventActions;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

interface DashboardProviderProps {
  children: ReactNode;
  taskActions: DashboardTaskActions;
  eventActions: DashboardEventActions;
}

/**
 * Provider component that wraps dashboard content and provides actions via context.
 */
export function DashboardProvider({ children, taskActions, eventActions }: DashboardProviderProps) {
  return (
    <DashboardContext.Provider value={{ taskActions, eventActions }}>
      {children}
    </DashboardContext.Provider>
  );
}

/**
 * Hook to access task actions from context.
 * Throws if used outside DashboardProvider.
 */
export function useDashboardTaskActions(): DashboardTaskActions {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardTaskActions must be used within a DashboardProvider');
  }
  return context.taskActions;
}

/**
 * Hook to access event actions from context.
 * Throws if used outside DashboardProvider.
 */
export function useDashboardEventActions(): DashboardEventActions {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardEventActions must be used within a DashboardProvider');
  }
  return context.eventActions;
}

/**
 * Hook to access all dashboard actions from context.
 * Throws if used outside DashboardProvider.
 */
export function useDashboardActions(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardActions must be used within a DashboardProvider');
  }
  return context;
}
