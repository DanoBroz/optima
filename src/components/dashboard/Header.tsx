import { format, addDays, subDays } from 'date-fns';
import { Calendar, Plus, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAddTask: () => void;
  onAutoSchedule: () => void;
  isScheduling: boolean;
}

export function Header({ 
  selectedDate, 
  onDateChange, 
  onAddTask,
  onAutoSchedule,
  isScheduling
}: HeaderProps) {
  const { user, signOut } = useAuth();
  const dayName = format(selectedDate, 'EEEE');
  const dateStr = format(selectedDate, 'MMMM d, yyyy');
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <header className="sticky top-0 z-20 glass shadow-soft safe-area-inset-top">
      <div className="container py-3 sm:py-4 md:py-6">
        <div className="flex items-center justify-between gap-2">
          <div className="animate-fade-in min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground mb-0.5 sm:mb-1">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">{dateStr}</span>
              {isToday && (
                <span className="px-1.5 sm:px-2 py-0.5 bg-primary/10 text-primary text-[10px] sm:text-xs font-medium rounded-full flex-shrink-0">
                  Today
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => onDateChange(subDays(selectedDate, 1))}
                className="p-1 hover:bg-secondary rounded-lg transition-colors active:scale-95"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              </button>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">
                {dayName}
              </h1>
              <button
                onClick={() => onDateChange(addDays(selectedDate, 1))}
                className="p-1 hover:bg-secondary rounded-lg transition-colors active:scale-95"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Auto-schedule button (desktop) */}
            <button
              onClick={onAutoSchedule}
              disabled={isScheduling}
              className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-xl font-medium text-sm hover:bg-accent/80 transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isScheduling ? 'animate-spin' : ''}`} />
              <span>{isScheduling ? 'Scheduling...' : 'Re-optimize'}</span>
            </button>
            
            {/* Add task button */}
            <button
              onClick={onAddTask}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm shadow-card hover:shadow-elevated transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Task</span>
            </button>
            
            {/* User avatar/logout */}
            {user && (
              <button
                onClick={() => signOut()}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-secondary flex items-center justify-center text-xs sm:text-sm font-medium text-muted-foreground hover:bg-secondary/80 transition-colors active:scale-95"
                title="Sign out"
              >
                {user.email?.[0].toUpperCase()}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
