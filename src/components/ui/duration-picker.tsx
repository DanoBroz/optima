import { cn } from "@/lib/utils";

export interface DurationOption {
  value: number;
  label: string;
}

const DEFAULT_DURATIONS: DurationOption[] = [
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '1h' },
  { value: 90, label: '1.5h' },
  { value: 120, label: '2h' },
];

interface DurationPickerProps {
  value: number;
  onChange: (minutes: number) => void;
  options?: DurationOption[];
  className?: string;
}

export function DurationPicker({
  value,
  onChange,
  options = DEFAULT_DURATIONS,
  className
}: DurationPickerProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
            value === opt.value
              ? "bg-accent text-accent-foreground ring-2 ring-primary/30"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
