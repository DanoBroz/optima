import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

const DESKTOP_BREAKPOINT = 640; // matches Tailwind's sm: breakpoint

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= DESKTOP_BREAKPOINT;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);

    mql.addEventListener("change", onChange);
    setIsDesktop(mql.matches);

    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

interface ResponsiveModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * A responsive modal component that renders:
 * - Desktop (≥640px): Centered dialog without drag
 * - Mobile (<640px): Bottom sheet drawer with drag-to-dismiss
 */
function ResponsiveModal({ open, onOpenChange, children }: ResponsiveModalProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        {children}
      </DialogPrimitive.Root>
    );
  }

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground
    >
      {children}
    </DrawerPrimitive.Root>
  );
}

interface ResponsiveModalContentProps {
  children: React.ReactNode;
  className?: string;
}

function ResponsiveModalContent({ children, className }: ResponsiveModalContentProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] bg-card rounded-2xl shadow-elevated",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "max-h-[85vh] flex flex-col",
            className
          )}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  }

  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm" />
      <DrawerPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mt-24 flex flex-col rounded-t-3xl bg-card",
          "max-h-[85vh]",
          className
        )}
      >
        {/* Drag handle - only shown on mobile */}
        <div className="mx-auto mt-4 h-1.5 w-10 rounded-full bg-muted-foreground/40" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  );
}

interface ResponsiveModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

function ResponsiveModalHeader({ children, className }: ResponsiveModalHeaderProps) {
  return (
    <div className={cn("flex-shrink-0 px-6 py-4 border-b border-border/50", className)}>
      {children}
    </div>
  );
}

interface ResponsiveModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

function ResponsiveModalBody({ children, className }: ResponsiveModalBodyProps) {
  return (
    <div className={cn("flex-1 overflow-y-auto overscroll-contain", className)}>
      {children}
    </div>
  );
}

interface ResponsiveModalTitleProps {
  children: React.ReactNode;
  className?: string;
}

function ResponsiveModalTitle({ children, className }: ResponsiveModalTitleProps) {
  const isDesktop = useIsDesktop();
  const Comp = isDesktop ? DialogPrimitive.Title : DrawerPrimitive.Title;

  return (
    <Comp className={cn("text-lg font-semibold", className)}>
      {children}
    </Comp>
  );
}

interface ResponsiveModalCloseProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

function ResponsiveModalClose({ children, className, asChild }: ResponsiveModalCloseProps) {
  const isDesktop = useIsDesktop();
  const Comp = isDesktop ? DialogPrimitive.Close : DrawerPrimitive.Close;

  return (
    <Comp className={className} asChild={asChild}>
      {children}
    </Comp>
  );
}

export {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalBody,
  ResponsiveModalTitle,
  ResponsiveModalClose,
  useIsDesktop,
};
