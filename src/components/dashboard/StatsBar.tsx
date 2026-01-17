import type { Task, DayCapacity, DailyEnergyLevel } from '@/types/task';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { formatDuration } from '@/utils/time';

interface StatsBarProps {
  tasks: Task[];
  capacity: DayCapacity;
  energyLevel?: DailyEnergyLevel | null;
}

const energyInfo: Record<DailyEnergyLevel, { label: string; emoji: string }> = {
  exhausted: { label: 'Rest day', emoji: '🌙' },
  low: { label: 'Light day', emoji: '🌿' },
  medium: { label: 'Balanced', emoji: '☀️' },
  high: { label: 'Productive', emoji: '⚡' },
  energized: { label: 'Peak flow', emoji: '🔥' },
};

export function StatsBar({ tasks, capacity, energyLevel }: StatsBarProps) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const scheduled = tasks.filter((t) => t.scheduled_time).length;
  
  const currentEnergy = energyLevel || 'medium';
  const info = energyInfo[currentEnergy];

  const stats = [
    {
      label: 'Done',
      value: completed,
      icon: CheckCircle2,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Pending',
      value: pending,
      icon: Circle,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Scheduled',
      value: scheduled,
      icon: Clock,
      color: 'text-accent-foreground',
      bg: 'bg-accent',
    },
  ];

  // Determine capacity bar color based on usage
  const getCapacityColor = () => {
    if (capacity.percentage > 100) return 'bg-destructive';
    if (capacity.percentage > 90) return 'bg-amber-500';
    if (capacity.percentage > 70) return 'bg-amber-400';
    return 'bg-primary';
  };

  return (
    <div className="bg-card rounded-3xl shadow-card border border-border/30 p-4 md:p-5">
      {/* Energy-based capacity header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-xl">{info.emoji}</span>
          </div>
          <div>
            <div className="text-sm font-semibold">{info.label}</div>
            <div className="text-xs text-muted-foreground">
              {formatDuration(capacity.total)} capacity
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">
            {formatDuration(capacity.available)}
          </div>
          <div className="text-xs text-muted-foreground font-medium">available</div>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="mb-5">
        <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${getCapacityColor()}`}
            style={{ width: `${Math.min(capacity.percentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-muted-foreground font-medium">
            {formatDuration(capacity.scheduled)} scheduled
          </span>
          <span className={`text-xs font-semibold ${
            capacity.percentage > 100 ? 'text-destructive' : 
            capacity.percentage > 90 ? 'text-amber-500' : 'text-muted-foreground'
          }`}>
            {capacity.percentage}% used
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} rounded-2xl p-3 text-center`}
          >
            <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
            <div className="text-lg font-bold">{stat.value}</div>
            <div className="text-[11px] text-muted-foreground font-medium">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
