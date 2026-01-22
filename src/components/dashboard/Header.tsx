import { format, addDays, subDays } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, Sparkles, Sun, Moon, Monitor, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';

interface HeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAddTask: () => void;
  onAutoSchedule: () => void;
  onOpenSettings: () => void;
  isScheduling: boolean;
}

export function Header({
  selectedDate,
  onDateChange,
  onAddTask,
  onAutoSchedule,
  onOpenSettings,
  isScheduling
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const dayName = format(selectedDate, 'EEEE');
  const dateStr = format(selectedDate, 'MMM d');
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  // Get actual system preference
  const getSystemPreference = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

  // Smart theme cycling - first click from system gives opposite of what you see
  // If system is dark: system → light → dark → system
  // If system is light: system → dark → light → system
  const toggleTheme = () => {
    const systemIsDark = getSystemPreference() === 'dark';

    if (systemIsDark) {
      // Cycle: system → light → dark → system
      if (theme === 'system') setTheme('light');
      else if (theme === 'light') setTheme('dark');
      else setTheme('system');
    } else {
      // Cycle: system → dark → light → system
      if (theme === 'system') setTheme('dark');
      else if (theme === 'dark') setTheme('light');
      else setTheme('system');
    }
  };

  // Icon shows current mode
  const ThemeIcon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl safe-area-inset-top">
      <div className="container py-4 md:py-5">
        <div className="flex items-center justify-between gap-3">
          {/* Date navigation - left side */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDateChange(subDays(selectedDate, 1))}
              className="p-2.5 hover:bg-secondary rounded-2xl transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <div className="text-center min-w-[120px]">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {dayName}
              </h1>
              <div className="flex items-center justify-center gap-2 mt-0.5">
                <span className="text-sm text-muted-foreground font-medium">{dateStr}</span>
                {isToday && (
                  <span className="px-2 py-0.5 bg-primary/15 text-primary text-xs font-semibold rounded-full">
                    Today
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => onDateChange(addDays(selectedDate, 1))}
              className="p-2.5 hover:bg-secondary rounded-2xl transition-all active:scale-95"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          
          {/* Actions - right side */}
          <div className="flex items-center gap-2">
            {/* Auto-schedule button (desktop) */}
            <button
              onClick={onAutoSchedule}
              disabled={isScheduling}
              className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-2xl font-semibold text-sm transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isScheduling ? 'animate-spin' : ''}`} />
              <span>{isScheduling ? 'Optimizing...' : 'Optimize'}</span>
            </button>
            
            {/* Add task button (desktop only) */}
            <button
              onClick={onAddTask}
              className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-2xl font-semibold text-sm shadow-card hover:shadow-elevated transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              <span>New Task</span>
            </button>

            {/* Theme toggle button */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-11 h-11 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-2xl transition-all duration-200 active:scale-95"
              aria-label="Toggle theme"
              title={theme === 'system' ? 'System theme' : theme === 'dark' ? 'Dark theme' : 'Light theme'}
            >
              <ThemeIcon className="w-5 h-5" />
            </button>

            {/* Settings button */}
            <button
              onClick={onOpenSettings}
              className="flex items-center justify-center w-11 h-11 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-2xl transition-all duration-200 active:scale-95"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
