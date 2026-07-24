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
  focusTrigger: () => void;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

function useDropdown(component: string) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error(`<${component}> harus digunakan di dalam <DropdownMenu>`);
  return ctx;
}

function focusMenuItem(menu: HTMLElement, dir: "next" | "prev" | "first" | "last") {
  const items = Array.from(
    menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([data-disabled])'),
  );
  if (items.length === 0) return;
  const current = items.findIndex((el) => el === document.activeElement);
  let idx = 0;
  if (dir === "next") idx = current === -1 ? 0 : (current + 1) % items.length;
  else if (dir === "prev") idx = current === -1 ? items.length - 1 : (current - 1 + items.length) % items.length;
  else if (dir === "last") idx = items.length - 1;
  // preventScroll: the menu is a position:fixed portal. A plain focus() makes
  // the browser scroll the MAIN PAGE instead of the menu, reproducing the
  // "page jumps down when opening/using the dropdown" bug.
  items[idx]?.focus({ preventScroll: true });
}

function DropdownMenu({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [align, setAlign] = React.useState<"start" | "center" | "end">("start");
  const rootId = React.useId();
  const focusTrigger = React.useCallback(() => {
    window.requestAnimationFrame(() => {
      document
        .getElementById(rootId)
        ?.querySelector<HTMLElement>("[data-slot='dropdown-trigger']")
        // preventScroll: restoring focus to the trigger on close must not
        // scroll the page or #main-content.
        ?.focus({ preventScroll: true });
    });
  }, [rootId]);
  return (
    <DropdownContext.Provider value={{ open, setOpen, rootId, align, setAlign, focusTrigger }}>
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    switch (e.key) {
      case "ArrowDown":
      case "Enter":
      case " ":
      case "Spacebar":
        e.preventDefault();
        if (!ctx.open) {
          ctx.setOpen(true);
          // focus first item after it renders
          window.requestAnimationFrame(() => {
            const root = document.getElementById(ctx.rootId);
            const menu = root?.parentElement?.querySelector('[role="menu"]');
            if (menu instanceof HTMLElement) focusMenuItem(menu, "first");
          });
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!ctx.open) {
          ctx.setOpen(true);
          window.requestAnimationFrame(() => {
            const root = document.getElementById(ctx.rootId);
            const menu = root?.parentElement?.querySelector('[role="menu"]');
            if (menu instanceof HTMLElement) focusMenuItem(menu, "last");
          });
        }
        break;
    }
  }

  return (
    <Comp
      data-slot="dropdown-trigger"
      type="button"
      aria-haspopup="menu"
      aria-expanded={ctx.open}
      onClick={() => ctx.setOpen(!ctx.open)}
      onKeyDown={handleKeyDown}
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

  // Focus first item on open for keyboard users; restore focus to trigger on close.
  React.useEffect(() => {
    if (!ctx.open) return;
    const root = document.getElementById(ctx.rootId);
    if (!root) return;
    // Only autofocus if opened via keyboard (activeElement is the trigger).
    const triggerEl = document
      .getElementById(ctx.rootId)
      ?.querySelector<HTMLElement>("[data-slot='dropdown-trigger']");
    const fromTrigger = !!triggerEl && document.activeElement === triggerEl;
    const id = window.requestAnimationFrame(() => {
      const menu = root.parentElement?.querySelector('[role="menu"]');
      if (menu instanceof HTMLElement && fromTrigger) focusMenuItem(menu, "first");
    });
    return () => window.cancelAnimationFrame(id);
  }, [ctx.open, ctx.rootId]);

  if (!mounted || typeof document === "undefined" || !ctx.open) return null;

  function handleMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!menuRef.current) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusMenuItem(menuRef.current, "next");
        break;
      case "ArrowUp":
        e.preventDefault();
        focusMenuItem(menuRef.current, "prev");
        break;
      case "Home":
        e.preventDefault();
        focusMenuItem(menuRef.current, "first");
        break;
      case "End":
        e.preventDefault();
        focusMenuItem(menuRef.current, "last");
        break;
      case "Escape":
        e.preventDefault();
        ctx.setOpen(false);
        ctx.focusTrigger();
        break;
      case "Tab":
        ctx.setOpen(false);
        break;
    }
  }

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      onKeyDown={handleMenuKeyDown}
      className={cn(
        "min-w-48 overflow-auto rounded-box border border-base-300 bg-base-100 p-1 text-base-content shadow-sm outline-none",
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
        ctx.focusTrigger();
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
