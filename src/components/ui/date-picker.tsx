import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string | undefined;
  onChange: (date: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  clearable = true,
  className
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = value ? new Date(value + 'T00:00:00') : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
      setOpen(false);
    }
  };

  const handleToday = () => {
    onChange(format(new Date(), 'yyyy-MM-dd'));
    setOpen(false);
  };

  const handleTomorrow = () => {
    onChange(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    setOpen(false);
  };

  const handleClear = () => {
    onChange(undefined);
    setOpen(false);
  };

  const displayValue = selectedDate
    ? format(selectedDate, 'MMM d, yyyy')
    : placeholder;

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
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* Quick action buttons */}
        <div className="flex gap-2 p-3 border-b border-border/50">
          <button
            type="button"
            onClick={handleToday}
            className="flex-1 py-2 bg-secondary/50 rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleTomorrow}
            className="flex-1 py-2 bg-secondary/50 rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
          >
            Tomorrow
          </button>
          {clearable && value && (
            <button
              type="button"
              onClick={handleClear}
              className="py-2 px-3 text-muted-foreground hover:text-destructive text-sm font-medium transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
