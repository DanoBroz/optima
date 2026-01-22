import { X, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChangesSummary } from '@/hooks/useDraft';

interface DraftActionBarProps {
  onCancel: () => void;
  onApply: () => void;
  isProcessing?: boolean;
  hasChanges: boolean;
  changesSummary: ChangesSummary;
}

export function DraftActionBar({
  onCancel,
  onApply,
  isProcessing = false,
  hasChanges,
  changesSummary,
}: DraftActionBarProps) {
  const { moved, new: newCount, unscheduled, scheduledTomorrow } = changesSummary;

  // Build summary text
  const summaryParts: string[] = [];
  if (moved > 0) summaryParts.push(`${moved} moved`);
  if (newCount > 0) summaryParts.push(`${newCount} new`);
  if (scheduledTomorrow > 0) summaryParts.push(`${scheduledTomorrow} tomorrow`);
  if (unscheduled > 0) summaryParts.push(`${unscheduled} couldn't fit`);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-20 md:hidden safe-area-inset-bottom">
      <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-elevated border border-border/30 p-2">
        {/* Summary row */}
        <div className="flex items-center justify-center gap-2 pb-2 mb-2 border-b border-border/30">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Review Changes</span>
          {summaryParts.length > 0 && (
            <span className="text-xs text-muted-foreground">
              · {summaryParts.join(' · ')}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {/* Cancel button */}
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium transition-all active:scale-95",
              "text-muted-foreground bg-secondary/50 hover:bg-secondary",
              isProcessing && "opacity-50 cursor-not-allowed"
            )}
          >
            <X className="w-4 h-4" />
            Cancel
          </button>

          {/* Apply button */}
          <button
            onClick={onApply}
            disabled={isProcessing || !hasChanges}
            className={cn(
              "flex-[1.5] flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95",
              hasChanges && !isProcessing
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            <Check className="w-4 h-4" />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
