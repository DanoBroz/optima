import { Calendar, CalendarDays, Inbox, Sparkles, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'timeline' | 'today' | 'backlog';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onAddTask?: () => void;
  onAutoSchedule?: () => void;
  isScheduling?: boolean;
}

const tabs = [
  { id: 'timeline' as const, label: 'Timeline', icon: Calendar },
  { id: 'today' as const, label: 'Today', icon: CalendarDays },
  { id: 'backlog' as const, label: 'Backlog', icon: Inbox },
];

export function TabBar({ 
  activeTab, 
  onTabChange, 
  onAddTask,
  onAutoSchedule,
  isScheduling 
}: TabBarProps) {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-20 md:hidden safe-area-inset-bottom">
      <div className="flex items-center gap-3">
        {/* Main tab navigation - floating pill */}
        <div className="flex-1 bg-card/95 backdrop-blur-xl rounded-3xl shadow-elevated border border-border/30 p-1.5">
          <div className="flex items-center justify-around">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-2.5 px-3 rounded-2xl transition-all duration-200 active:scale-95",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon
                    className={cn(
                      "w-5 h-5 transition-all duration-200",
                      isActive && "scale-110"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={cn(
                    "text-[11px] font-semibold",
                    isActive && "font-bold"
                  )}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Floating action buttons */}
        <div className="flex flex-col gap-2">
          {onAutoSchedule && (
            <button
              onClick={onAutoSchedule}
              disabled={isScheduling}
              className="w-12 h-12 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-2xl shadow-card flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={cn("w-5 h-5", isScheduling && "animate-spin")} />
            </button>
          )}
          {onAddTask && (
            <button
              onClick={onAddTask}
              className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl shadow-elevated flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
