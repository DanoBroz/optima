import { cn } from '@/lib/utils';

interface FormLabelProps {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

/**
 * Standardized form label styling used across modals and forms.
 * Replaces the repeated pattern: `<label className="block text-sm font-medium text-muted-foreground mb-2">`
 */
export function FormLabel({ children, className, htmlFor }: FormLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-sm font-medium text-muted-foreground mb-2", className)}
    >
      {children}
    </label>
  );
}
