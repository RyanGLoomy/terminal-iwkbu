"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { IconX } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { Slot } from "@/lib/slot";

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialog(component: string) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error(`<${component}> harus digunakan di dalam <Dialog>`);
  return ctx;
}

function Dialog({
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
    <DialogContext.Provider value={{ open: !!current, onOpenChange: setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const ctx = useDialog("DialogTrigger");
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type="button"
      onClick={() => ctx.onOpenChange(true)}
      {...props}
    >
      {children}
    </Comp>
  );
}

function DialogContent({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const ctx = useDialog("DialogContent");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Escape to close + body scroll lock
  React.useEffect(() => {
    if (!ctx.open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        ctx.onOpenChange(false);
      }
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [ctx.open, ctx.onOpenChange]);

  if (!mounted || !ctx.open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={() => ctx.onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Modal box */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-base-300 bg-base-100 p-6 shadow-xl",
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
          <IconX className="size-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-1.5 pr-8 text-left", className)} {...props} />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none", className)} {...props} />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-sm text-base-content/60", className)} {...props} />
  );
}

const DialogPortal = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
const DialogOverlay = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
const DialogClose = ({
  asChild,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) => {
  const ctx = useDialog("DialogClose");
  const Comp = asChild ? Slot : "button";
  return (
    <Comp type="button" onClick={() => ctx.onOpenChange(false)} {...props}>
      {children}
    </Comp>
  );
};

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
