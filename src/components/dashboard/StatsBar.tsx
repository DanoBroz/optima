import type { Task, DayCapacity, DailyEnergyLevel } from '@/types/task';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface StatsBarProps {
  tasks: Task[];
  capacity: DayCapacity;
  energyLevel?: DailyEnergyLevel | null;
}

const energyInfo: Record<DailyEnergyLevel, { label: string; hours: string; emoji: string }> = {
  exhausted: { label: 'Rest day', hours: '~4h', emoji: '😴' },
  low: { label: 'Light day', hours: '~6.5h', emoji: '😔' },
  medium: { label: 'Normal day', hours: '~9h', emoji: '😊' },
  high: { label: 'Productive', hours: '~11h', emoji: '😄' },
  energized: { label: 'Peak day', hours: '~13h', emoji: '🔥' },
};

export function StatsBar({ tasks, capacity, energyLevel }: StatsBarProps) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const scheduled = tasks.filter((t) => t.scheduled_time).length;
  
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

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
    if (capacity.percentage > 90) return 'bg-orange-500';
    if (capacity.percentage > 70) return 'bg-yellow-500';
    return 'bg-primary';
  };

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border/50 p-3 sm:p-4">
      {/* Energy-based capacity header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-xl">{info.emoji}</span>
          <div>
            <div className="text-sm font-medium">{info.label}</div>
            <div className="text-xs text-muted-foreground">
              {formatTime(capacity.total)} capacity today
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg sm:text-xl font-bold text-primary">
            {formatTime(capacity.available)}
          </div>
          <div className="text-xs text-muted-foreground">available</div>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="mb-4">
        <div className="h-3 bg-secondary rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${getCapacityColor()}`}
            style={{ width: `${Math.min(capacity.percentage, 100)}%` }}
          />
          {capacity.percentage > 100 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-destructive-foreground">
                OVERBOOKED
              </span>
            </div>
          )}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-muted-foreground">
            {formatTime(capacity.scheduled)} scheduled
          </span>
          <span className={`text-xs font-medium ${
            capacity.percentage > 100 ? 'text-destructive' : 
            capacity.percentage > 90 ? 'text-orange-500' : 'text-muted-foreground'
          }`}>
            {capacity.percentage}% used
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} rounded-xl p-2 sm:p-3 text-center`}
          >
            <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color} mx-auto mb-0.5 sm:mb-1`} />
            <div className="text-base sm:text-lg font-semibold">{stat.value}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
