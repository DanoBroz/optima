import { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string | undefined;
  onChange: (time: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  disabled = false,
  clearable = false,
  className
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  const currentHour = value ? parseInt(value.split(':')[0], 10) : null;
  const currentMinute = value ? parseInt(value.split(':')[1], 10) : null;

  // Initialize selection from current value
  useEffect(() => {
    if (open) {
      setSelectedHour(currentHour);
      setSelectedMinute(currentMinute !== null ? Math.round(currentMinute / 5) * 5 : null);
    }
  }, [open, currentHour, currentMinute]);

  // Auto-scroll to selected values when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (hoursRef.current && currentHour !== null) {
          const hourButton = hoursRef.current.children[currentHour] as HTMLElement;
          if (hourButton) {
            hourButton.scrollIntoView({ block: 'center', behavior: 'instant' });
          }
        }
        if (minutesRef.current && currentMinute !== null) {
          const minuteIndex = Math.round(currentMinute / 5);
          const minuteButton = minutesRef.current.children[minuteIndex] as HTMLElement;
          if (minuteButton) {
            minuteButton.scrollIntoView({ block: 'center', behavior: 'instant' });
          }
        }
      }, 0);
    }
  }, [open, currentHour, currentMinute]);

  const handleHourClick = (hour: number) => {
    setSelectedHour(hour);
    const minute = selectedMinute ?? currentMinute ?? 0;
    const roundedMinute = Math.round(minute / 5) * 5;
    const timeString = `${String(hour).padStart(2, '0')}:${String(roundedMinute).padStart(2, '0')}`;
    onChange(timeString);
  };

  const handleMinuteClick = (minute: number) => {
    setSelectedMinute(minute);
    const hour = selectedHour ?? currentHour ?? 9;
    const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    onChange(timeString);
  };

  const handleClear = () => {
    onChange(undefined);
    setSelectedHour(null);
    setSelectedMinute(null);
    setOpen(false);
  };

  const displayValue = value || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full px-3 py-3 bg-secondary rounded-xl border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-left flex items-center justify-between",
            disabled && "opacity-60 cursor-not-allowed",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span>{displayValue}</span>
          <Clock className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-3">
          {/* Header with clear button */}
          {clearable && value && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {/* Two-column picker */}
          <div className="flex gap-2">
            {/* Hours column */}
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-2 font-medium">Hour</div>
              <div
                ref={hoursRef}
                className="h-48 w-14 overflow-y-auto rounded-lg bg-secondary/30"
              >
                {HOURS.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => handleHourClick(hour)}
                    className={cn(
                      "w-full py-2.5 text-sm font-medium transition-colors",
                      (selectedHour ?? currentHour) === hour
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary text-foreground"
                    )}
                  >
                    {String(hour).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Separator */}
            <div className="flex items-center text-muted-foreground font-bold text-lg pt-6">:</div>

            {/* Minutes column */}
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-2 font-medium">Min</div>
              <div
                ref={minutesRef}
                className="h-48 w-14 overflow-y-auto rounded-lg bg-secondary/30"
              >
                {MINUTES.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => handleMinuteClick(minute)}
                    className={cn(
                      "w-full py-2.5 text-sm font-medium transition-colors",
                      (selectedMinute ?? (currentMinute !== null ? Math.round(currentMinute / 5) * 5 : null)) === minute
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary text-foreground"
                    )}
                  >
                    {String(minute).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
