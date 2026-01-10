import { Calendar, CheckSquare, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'timeline' | 'tasks' | 'all';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs = [
  { id: 'timeline' as const, label: 'Timeline', icon: Calendar },
  { id: 'tasks' as const, label: 'Tasks', icon: CheckSquare },
  { id: 'all' as const, label: 'All', icon: LayoutGrid },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="sticky bottom-0 left-0 right-0 z-20 md:hidden safe-area-inset-bottom">
      <div className="glass shadow-elevated border-t border-border/50">
        <div className="flex items-center justify-around py-2 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 active:scale-95",
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon
                className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  activeTab === tab.id && "scale-110"
                )}
              />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
