import { Clock, Ghost } from 'lucide-react';
import type { Task } from '@/types/task';
import { cn } from '@/lib/utils';

interface GhostTaskCardProps {
  task: Task;
  originalTime: string;
}

export function GhostTaskCard({ task, originalTime }: GhostTaskCardProps) {
  return (
    <div
      className={cn(
        "relative bg-card/30 rounded-2xl border-2 border-dashed border-border/50",
        "p-3 opacity-40 pointer-events-none"
      )}
    >
      <div className="flex items-start gap-3 pl-4">
        {/* Ghost icon */}
        <div className="flex-shrink-0 w-5 h-5 rounded-lg flex items-center justify-center mt-0.5">
          <Ghost className="w-4 h-4 text-muted-foreground/50" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-muted-foreground/70 line-through">
            {task.title}
          </p>
          
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1 text-muted-foreground/50">
              <Clock className="w-3 h-3" />
              <span className="text-xs font-medium">
                {originalTime} (was here)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
