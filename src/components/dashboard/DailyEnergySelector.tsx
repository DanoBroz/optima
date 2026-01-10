import type { DailyEnergyLevel } from '@/types/task';
import { cn } from '@/lib/utils';

interface DailyEnergySelectorProps {
  currentLevel: DailyEnergyLevel | null;
  onSelect: (level: DailyEnergyLevel) => void;
}

const energyConfig: { level: DailyEnergyLevel; emoji: string; label: string; colorClass: string }[] = [
  { level: 'exhausted', emoji: '😴', label: 'Exhausted', colorClass: 'text-[hsl(var(--energy-exhausted))]' },
  { level: 'low', emoji: '😔', label: 'Low', colorClass: 'text-[hsl(var(--energy-low))]' },
  { level: 'medium', emoji: '😊', label: 'Okay', colorClass: 'text-[hsl(var(--energy-medium))]' },
  { level: 'high', emoji: '😄', label: 'Good', colorClass: 'text-[hsl(var(--energy-high))]' },
  { level: 'energized', emoji: '🔥', label: 'Great!', colorClass: 'text-[hsl(var(--energy-energized))]' },
];

export function DailyEnergySelector({ currentLevel, onSelect }: DailyEnergySelectorProps) {
  return (
    <div className="bg-card rounded-2xl p-3 sm:p-4 shadow-card border border-border/50">
      <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">
        How's your energy today?
      </h3>
      <div className="flex gap-1.5 sm:gap-2">
        {energyConfig.map(({ level, emoji, label, colorClass }) => {
          const isSelected = currentLevel === level;
          
          return (
            <button
              key={level}
              onClick={() => onSelect(level)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 sm:gap-1 py-2 sm:py-2.5 px-1 sm:px-2 rounded-xl transition-all",
                isSelected
                  ? "bg-primary/10 ring-2 ring-primary/50 scale-105"
                  : "bg-secondary/50 hover:bg-secondary active:scale-95"
              )}
            >
              <span className={cn(
                "text-xl sm:text-2xl transition-all",
                isSelected ? "" : "grayscale opacity-60"
              )}>
                {emoji}
              </span>
              <span className={cn(
                "text-[10px] sm:text-xs font-medium truncate w-full text-center",
                isSelected ? colorClass : "text-muted-foreground"
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}