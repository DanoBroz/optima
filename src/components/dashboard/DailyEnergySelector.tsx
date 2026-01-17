import type { DailyEnergyLevel } from '@/types/task';
import { cn } from '@/lib/utils';

interface DailyEnergySelectorProps {
  currentLevel: DailyEnergyLevel | null;
  onSelect: (level: DailyEnergyLevel) => void;
}

const energyConfig: { level: DailyEnergyLevel; emoji: string; label: string }[] = [
  { level: 'exhausted', emoji: '🌙', label: 'Rest' },
  { level: 'low', emoji: '🌿', label: 'Low' },
  { level: 'medium', emoji: '☀️', label: 'Good' },
  { level: 'high', emoji: '⚡', label: 'High' },
  { level: 'energized', emoji: '🔥', label: 'Peak' },
];

export function DailyEnergySelector({ currentLevel, onSelect }: DailyEnergySelectorProps) {
  return (
    <div className="bg-card rounded-3xl p-4 md:p-5 shadow-card border border-border/30">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        How's your energy today?
      </h3>
      <div className="flex gap-2">
        {energyConfig.map(({ level, emoji, label }) => {
          const isSelected = currentLevel === level;
          
          return (
            <button
              key={level}
              onClick={() => onSelect(level)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all duration-200",
                isSelected
                  ? "bg-primary/15 ring-2 ring-primary/40 scale-105"
                  : "bg-secondary/50 hover:bg-secondary active:scale-95"
              )}
            >
              <span className={cn(
                "text-2xl transition-all",
                isSelected ? "scale-110" : "grayscale opacity-50"
              )}>
                {emoji}
              </span>
              <span className={cn(
                "text-[11px] font-semibold",
                isSelected ? "text-primary" : "text-muted-foreground"
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
