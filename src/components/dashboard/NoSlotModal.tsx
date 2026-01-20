import { useState } from 'react';
import { AlertTriangle, Inbox, Clock, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NoSlotResolution = 
  | 'backlog'              // Keep in backlog
  | 'ignore_preset'        // Ignore preset only (stay within work hours)
  | 'ignore_all'           // Ignore preset + work hours
  | 'next_day';            // Schedule next day (respect constraints)

interface NoSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolution: NoSlotResolution) => void;
  unscheduledCount: number;
}

type Step = 'main' | 'constraints';

const mainOptions: Array<{
  value: NoSlotResolution | 'out_of_constraints';
  icon: typeof Clock;
  title: string;
  description: string;
  showArrow?: boolean;
}> = [
  {
    value: 'backlog',
    icon: Inbox,
    title: 'Keep in backlog',
    description: 'Leave unscheduled tasks in the backlog',
  },
  {
    value: 'out_of_constraints',
    icon: Clock,
    title: 'Schedule out of constraints',
    description: 'Ignore time constraints to find available slots',
    showArrow: true,
  },
  {
    value: 'next_day',
    icon: Calendar,
    title: 'Schedule next day',
    description: 'Try to schedule on the next day instead',
  },
];

const constraintOptions: Array<{
  value: NoSlotResolution;
  title: string;
  description: string;
}> = [
  {
    value: 'ignore_preset',
    title: 'Ignore preset only',
    description: 'Schedule outside morning/afternoon/evening preset, but stay within work hours',
  },
  {
    value: 'ignore_all',
    title: 'Ignore all constraints',
    description: 'Schedule anywhere in the day, including outside work hours',
  },
];

export function NoSlotModal({
  isOpen,
  onClose,
  onResolve,
  unscheduledCount,
}: NoSlotModalProps) {
  const [step, setStep] = useState<Step>('main');

  if (!isOpen) return null;

  const handleMainSelect = (value: NoSlotResolution | 'out_of_constraints') => {
    if (value === 'out_of_constraints') {
      setStep('constraints');
    } else {
      onResolve(value as NoSlotResolution);
      handleClose();
    }
  };

  const handleConstraintSelect = (value: NoSlotResolution) => {
    onResolve(value);
    handleClose();
  };

  const handleClose = () => {
    setStep('main');
    onClose();
  };

  const handleBack = () => {
    setStep('main');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-card rounded-2xl shadow-elevated animate-slide-up">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold">
              {step === 'main' ? 'No available slots' : 'Choose constraint level'}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {step === 'main' ? (
              <>
                <span className="font-medium text-foreground">{unscheduledCount}</span>{' '}
                {unscheduledCount === 1 ? 'task' : 'tasks'} could not be scheduled due to time
                constraints. How would you like to proceed?
              </>
            ) : (
              'Choose how much to relax the time constraints for scheduling.'
            )}
          </p>
        </div>

        {/* Options */}
        <div className="p-4 space-y-2">
          {step === 'main' ? (
            mainOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => handleMainSelect(option.value)}
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
                  {option.showArrow && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground mt-2" />
                  )}
                </button>
              );
            })
          ) : (
            <>
              {constraintOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleConstraintSelect(option.value)}
                  className={cn(
                    'w-full flex items-start gap-3 p-4 rounded-xl text-left',
                    'bg-secondary/50 hover:bg-secondary transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary/50'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{option.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex gap-2">
          {step === 'constraints' && (
            <button
              onClick={handleBack}
              className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleClose}
            className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
