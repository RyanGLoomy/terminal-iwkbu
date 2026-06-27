"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Slot } from "@/lib/slot";

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  rootId: string;
  align: "start" | "center" | "end";
  setAlign: (a: "start" | "center" | "end") => void;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

function useDropdown(component: string) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error(`<${component}> harus digunakan di dalam <DropdownMenu>`);
  return ctx;
}

function DropdownMenu({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [align, setAlign] = React.useState<"start" | "center" | "end">("start");
  const rootId = React.useId();
  return (
    <DropdownContext.Provider value={{ open, setOpen, rootId, align, setAlign }}>
      <span id={rootId} data-dropdown-root className="relative inline-flex">
        {children}
      </span>
    </DropdownContext.Provider>
  );
}

function DropdownMenuTrigger({
  asChild,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const ctx = useDropdown("DropdownMenuTrigger");
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type="button"
      aria-haspopup="menu"
      aria-expanded={ctx.open}
      onClick={() => ctx.setOpen(!ctx.open)}
      className={className}
      {...props}
    >
      {children}
    </Comp>
  );
}

function DropdownMenuContent({
  className,
  children,
  align = "end",
  sideOffset = 4,
}: {
  className?: string;
  children?: React.ReactNode;
  align?: "start" | "center" | "end";
  sideOffset?: number;
}) {
  const ctx = useDropdown("DropdownMenuContent");
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = React.useState<React.CSSProperties>({});
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    ctx.setAlign(align);
  }, [align, ctx]);

  // Tutup saat klik di luar root maupun menu.
  React.useEffect(() => {
    if (!ctx.open) return;
    function onPointer(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      const root = document.getElementById(ctx.rootId);
      if (root?.contains(target)) return;
      ctx.setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [ctx]);

  React.useEffect(() => {
    if (!ctx.open) return;
    const root = document.getElementById(ctx.rootId);
    if (!root) return;
    const place = () => {
      const r = root.getBoundingClientRect();
      const left =
        ctx.align === "end"
          ? r.right
          : ctx.align === "center"
            ? r.left + r.width / 2
            : r.left;
      setCoords({
        position: "fixed",
        top: r.bottom + sideOffset,
        left,
        transform:
          ctx.align === "end"
            ? "translateX(-100%)"
            : ctx.align === "center"
              ? "translateX(-50%)"
              : undefined,
        zIndex: 60,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [ctx, sideOffset]);

  if (!mounted || typeof document === "undefined" || !ctx.open) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className={cn(
        "min-w-48 overflow-auto rounded-box border border-base-300 bg-base-100 p-1 text-base-content shadow-lg",
        "animate-[fadeIn_0.12s_ease]",
        className,
      )}
      style={coords}
    >
      {children}
    </div>,
    document.body,
  );
}

function DropdownMenuItem({
  className,
  inset,
  asChild,
  onClick,
  children,
  ...props
}: React.ComponentProps<"button"> & { inset?: boolean; asChild?: boolean }) {
  const ctx = useDropdown("DropdownMenuItem");
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      role="menuitem"
      type="button"
      onClick={(e) => {
        ctx.setOpen(false);
        onClick?.(e);
      }}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-base-200 focus:bg-base-200 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        inset && "pl-8",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<"div"> & { inset?: boolean }) {
  return (
    <div
      className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("-mx-1 my-1 h-px bg-base-300", className)} {...props} />;
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<"button"> & { checked?: boolean }) {
  return (
    <DropdownMenuItem className={cn("pl-8", className)} {...props}>
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        {checked && <Check className="size-4" />}
      </span>
      {children}
    </DropdownMenuItem>
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <DropdownMenuItem className={cn("pl-8", className)} {...props}>
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <Circle className="size-2 fill-current" />
      </span>
      {children}
    </DropdownMenuItem>
  );
}

const DropdownMenuGroup = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
const DropdownMenuPortal = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
const DropdownMenuSub = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
const DropdownMenuSubTrigger = DropdownMenuItem;
const DropdownMenuSubContent = DropdownMenuContent;
const DropdownMenuRadioGroup = DropdownMenuGroup;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
