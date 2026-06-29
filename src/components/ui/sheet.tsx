"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Slot } from "@/lib/slot";

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheet(component: string) {
  const ctx = React.useContext(SheetContext);
  if (!ctx) throw new Error(`<${component}> harus digunakan di dalam <Sheet>`);
  return ctx;
}

function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}) {
  const [internal, setInternal] = React.useState(false);
  const isControlled = open !== undefined;
  const current = isControlled ? open : internal;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternal(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );
  return (
    <SheetContext.Provider value={{ open: !!current, onOpenChange: setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

function SheetTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const ctx = useSheet("SheetTrigger");
  const Comp = asChild ? Slot : "button";
  return (
    <Comp type="button" onClick={() => ctx.onOpenChange(true)} {...props}>
      {children}
    </Comp>
  );
}

function SheetClose({
  asChild,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const ctx = useSheet("SheetClose");
  const Comp = asChild ? Slot : "button";
  return (
    <Comp type="button" onClick={() => ctx.onOpenChange(false)} {...props}>
      {children}
    </Comp>
  );
}

const SIDE_CLASS: Record<"top" | "bottom" | "left" | "right", string> = {
  top: "inset-x-0 top-0 rounded-b-xl border-b",
  bottom: "inset-x-0 bottom-0 rounded-t-xl border-t",
  left: "inset-y-0 left-0 h-full w-80 max-w-[85vw] border-r",
  right: "inset-y-0 right-0 h-full w-80 max-w-[85vw] border-l",
};

function SheetContent({
  className,
  children,
  side = "right",
}: {
  className?: string;
  children?: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const ctx = useSheet("SheetContent");
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const previousFocus = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!ctx.open) return;

    // Record & move focus into the sheet; restore on close.
    previousFocus.current = (document.activeElement as HTMLElement) ?? null;
    const dialog = dialogRef.current;
    const focusables = dialog
      ? (Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute("disabled")) )
      : [];
    (focusables[0] ?? dialog)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        ctx.onOpenChange(false);
        return;
      }
      if (e.key === "Tab" && dialog && focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previousFocus.current?.focus?.();
    };
  }, [ctx]);

  if (!ctx.open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-base-content/50"
        onClick={() => ctx.onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "absolute bg-base-100 p-6 text-base-content shadow-sm outline-none transition-transform duration-300 overscroll-contain",
          SIDE_CLASS[side],
          className,
        )}
      >
        {children}
        <button
          type="button"
          onClick={() => ctx.onOpenChange(false)}
          className="btn btn-circle btn-ghost btn-sm absolute right-3 top-3"
          aria-label="Tutup"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col space-y-2 pr-8 text-left", className)} {...props} />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end", className)} {...props} />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-lg font-semibold text-base-content", className)} {...props} />;
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-base-content/60", className)} {...props} />;
}

const SheetPortal = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
const SheetOverlay = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
