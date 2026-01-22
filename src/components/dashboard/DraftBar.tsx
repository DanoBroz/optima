import { X, RefreshCw, Check, Sparkles } from 'lucide-react';
import type { ChangesSummary } from '@/hooks/useDraft';
import { cn } from '@/lib/utils';

interface DraftBarProps {
  changesSummary: ChangesSummary;
  onCancel: () => void;
  onReOptimize: () => void;
  onApply: () => void;
  isProcessing?: boolean;
}

export function DraftBar({
  changesSummary,
  onCancel,
  onReOptimize,
  onApply,
  isProcessing = false,
}: DraftBarProps) {
  const { moved, new: newCount, unscheduled, scheduledTomorrow } = changesSummary;
  const hasChanges = moved > 0 || newCount > 0;

  // Build summary text
  const summaryParts: string[] = [];
  if (moved > 0) summaryParts.push(`${moved} rescheduled`);
  if (newCount > 0) summaryParts.push(`${newCount} new`);
  if (scheduledTomorrow > 0) summaryParts.push(`${scheduledTomorrow} tomorrow`);
  if (unscheduled > 0) summaryParts.push(`${unscheduled} couldn't fit`);

  return (
    <div className="flex-shrink-0 sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-primary/20">
      <div className="px-4 py-3">
        {/* Title row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Review Changes</h3>
              {summaryParts.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {summaryParts.join(' • ')}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Cancel button */}
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                "text-muted-foreground hover:text-foreground hover:bg-secondary",
                isProcessing && "opacity-50 cursor-not-allowed"
              )}
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>

            {/* Re-optimize button */}
            <button
              onClick={onReOptimize}
              disabled={isProcessing}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                "bg-secondary text-foreground hover:bg-secondary/80",
                isProcessing && "opacity-50 cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isProcessing && "animate-spin")} />
              Re-optimize
            </button>

            {/* Apply button */}
            <button
              onClick={onApply}
              disabled={isProcessing || !hasChanges}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                hasChanges && !isProcessing
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              <Check className="w-3.5 h-3.5" />
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
