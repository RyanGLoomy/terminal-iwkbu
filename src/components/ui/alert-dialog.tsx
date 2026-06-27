"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Slot } from "@/lib/slot";

interface AlertDialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

function useAlertDialog(component: string) {
  const ctx = React.useContext(AlertDialogContext);
  if (!ctx) throw new Error(`<${component}> harus digunakan di dalam <AlertDialog>`);
  return ctx;
}

function AlertDialog({
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
    <AlertDialogContext.Provider value={{ open: !!current, onOpenChange: setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

function AlertDialogTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const ctx = useAlertDialog("AlertDialogTrigger");
  const Comp = asChild ? Slot : "button";
  return (
    <Comp type="button" onClick={() => ctx.onOpenChange(true)} {...props}>
      {children}
    </Comp>
  );
}

function AlertDialogContent({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const ctx = useAlertDialog("AlertDialogContent");
  const ref = React.useRef<HTMLDialogElement | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (ctx.open && !el.open) {
      try {
        el.showModal();
      } catch {
        /* already open */
      }
    } else if (!ctx.open && el.open) {
      el.close();
    }
  }, [ctx.open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        ctx.onOpenChange(false);
      }}
    >
      <div className={cn("modal-box rounded-xl border border-base-300 bg-base-100 p-6 shadow-xl", className)}>
        {children}
      </div>
      <div className="modal-backdrop" aria-hidden="true" />
    </dialog>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2 text-left", className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
  );
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />;
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-base-content/60", className)} {...props} />;
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return <button type="button" className={cn("btn btn-primary", className)} {...props} />;
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return <button type="button" className={cn("btn btn-ghost", className)} {...props} />;
}

const AlertDialogPortal = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
const AlertDialogOverlay = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
