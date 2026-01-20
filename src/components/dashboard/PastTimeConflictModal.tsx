import { Clock, Calendar, Inbox, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PastTimeResolution = 
  | 'auto_today'      // Auto-place in next available slot today
  | 'tomorrow'        // Schedule tomorrow in first available slot
  | 'backlog'         // Leave in backlog (clear date/time)
  | 'completed';      // Mark as completed (for logging historical tasks)

interface PastTimeConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolution: PastTimeResolution) => void;
  taskTitle: string;
  attemptedTime: string;
}

const resolutionOptions: Array<{
  value: PastTimeResolution;
  icon: typeof Clock;
  title: string;
  description: string;
}> = [
  {
    value: 'auto_today',
    icon: Clock,
    title: 'Schedule today',
    description: 'Auto-place in the next available time slot today',
  },
  {
    value: 'tomorrow',
    icon: Calendar,
    title: 'Schedule tomorrow',
    description: 'Schedule in the first available slot tomorrow',
  },
  {
    value: 'backlog',
    icon: Inbox,
    title: 'Move to backlog',
    description: 'Save without a scheduled time',
  },
  {
    value: 'completed',
    icon: CheckCircle,
    title: 'Mark as completed',
    description: 'Log this as a completed historical task',
  },
];

export function PastTimeConflictModal({
  isOpen,
  onClose,
  onResolve,
  taskTitle,
  attemptedTime,
}: PastTimeConflictModalProps) {
  if (!isOpen) return null;

  const handleResolve = (resolution: PastTimeResolution) => {
    onResolve(resolution);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-card rounded-2xl shadow-elevated animate-slide-up">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold">Past time selected</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            The time <span className="font-medium text-foreground">{attemptedTime}</span> has
            already passed. How would you like to schedule{' '}
            <span className="font-medium text-foreground">"{taskTitle}"</span>?
          </p>
        </div>

        {/* Options */}
        <div className="p-4 space-y-2">
          {resolutionOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => handleResolve(option.value)}
                className={cn(
                  'w-full flex items-start gap-3 p-4 rounded-xl text-left',
                  'bg-secondary/50 hover:bg-secondary transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50'
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{option.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Cancel */}
        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
