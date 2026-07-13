"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

interface ItemEntry {
  value: string;
  element: HTMLDivElement;
}

interface SelectContextValue {
  value: string | undefined;
  onItemSelect: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled: boolean | undefined;
  rootId: string;
  registerLabel: (value: string, label: string) => void;
  getLabel: (value: string) => string | undefined;
  // keyboard a11y
  activeIndex: number;
  setActiveIndex: (n: number) => void;
  registerItem: (entry: ItemEntry) => () => void;
  focusActive: () => void;
  focusTrigger: () => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext(component: string) {
  const ctx = React.useContext(SelectContext);
  if (!ctx) {
    throw new Error(`<${component}> harus digunakan di dalam <Select>`);
  }
  return ctx;
}

function Select({
  value,
  defaultValue,
  onValueChange,
  disabled,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const current = isControlled ? value : internal;
  const [open, setOpen] = React.useState(false);
  const labelsRef = React.useRef<Record<string, string>>({});
  const itemsRef = React.useRef<ItemEntry[]>([]);
  const [activeIndex, setActiveIndexState] = React.useState(0);
  const [, forceRender] = React.useReducer((n) => n + 1, 0);
  const rootId = React.useId();

  const registerLabel = React.useCallback((val: string, label: string) => {
    if (labelsRef.current[val] !== label) {
      labelsRef.current[val] = label;
      forceRender();
    }
  }, []);

  const focusTrigger = React.useCallback(() => {
    const el = document
      .getElementById(rootId)
      ?.querySelector<HTMLElement>("[data-slot='select-trigger']");
    el?.focus();
  }, [rootId]);

  const onItemSelect = React.useCallback(
    (val: string) => {
      if (!isControlled) setInternal(val);
      onValueChange?.(val);
      setOpen(false);
      // Return focus to the trigger after selection.
      window.requestAnimationFrame(focusTrigger);
    },
    [isControlled, onValueChange, focusTrigger],
  );

  const getLabel = React.useCallback((val: string) => labelsRef.current[val], []);

  const registerItem = React.useCallback((entry: ItemEntry) => {
    itemsRef.current = [...itemsRef.current, entry];
    return () => {
      itemsRef.current = itemsRef.current.filter((i) => i.element !== entry.element);
    };
  }, []);

  const setActiveIndex = React.useCallback((n: number) => {
    setActiveIndexState(n);
  }, []);

  const focusActive = React.useCallback(() => {
    const items = itemsRef.current;
    if (items[activeIndex]) {
      items[activeIndex].element.focus();
    } else if (items[0]) {
      items[0].element.focus();
    }
  }, [activeIndex]);

  // When opening, jump to the currently-selected option (or first).
  React.useEffect(() => {
    if (!open) return;
    const items = itemsRef.current;
    const idx = Math.max(
      0,
      items.findIndex((i) => i.value === current),
    );
    setActiveIndexState(idx);
    const id = window.requestAnimationFrame(() => {
      items[idx]?.element.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, current]);

  return (
    <SelectContext.Provider
      value={{
        value: current,
        onItemSelect,
        open,
        setOpen,
        disabled,
        rootId,
        registerLabel,
        getLabel,
        activeIndex,
        setActiveIndex,
        registerItem,
        focusActive,
        focusTrigger,
      }}
    >
      <div id={rootId} data-select-root className="relative inline-block w-full" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

const SelectGroup = ({ children }: { children?: React.ReactNode }) => (
  <>{children}</>
);
const SelectValue = ({
  children,
  placeholder,
  className,
}: {
  children?: React.ReactNode;
  placeholder?: string;
  className?: string;
}) => {
  const ctx = useSelectContext("SelectValue");
  const label = ctx.value ? ctx.getLabel(ctx.value) : undefined;
  return (
    <span className={cn("line-clamp-1", className)}>
      {label ?? children ?? placeholder}
    </span>
  );
};

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<"button">) {
  const ctx = useSelectContext("SelectTrigger");

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (ctx.disabled) return;
    switch (e.key) {
      case "ArrowDown":
      case "Enter":
      case " ":
      case "Spacebar":
        e.preventDefault();
        if (!ctx.open) ctx.setOpen(true);
        else ctx.focusActive();
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!ctx.open) {
          ctx.setOpen(true);
          // will land on selected in the open effect
        }
        break;
      case "Escape":
        if (ctx.open) {
          e.preventDefault();
          ctx.setOpen(false);
        }
        break;
    }
  }

  return (
    <button
      type="button"
      data-slot="select-trigger"
      aria-haspopup="listbox"
      aria-expanded={ctx.open}
      disabled={ctx.disabled}
      onClick={() => ctx.setOpen(!ctx.open)}
      onKeyDown={handleKeyDown}
      className={cn(
        "input input-bordered flex h-11 w-full cursor-pointer items-center justify-between gap-2 bg-base-100 pr-3 text-left text-base-content",
        ctx.disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
    </button>
  );
}

function SelectContent({
  className,
  children,
  align = "start",
}: {
  className?: string;
  children?: React.ReactNode;
  align?: "start" | "center" | "end";
}) {
  const ctx = useSelectContext("SelectContent");
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = React.useState<React.CSSProperties>({});
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Tutup saat klik di luar root maupun menu (tanpa koordinasi ref via context).
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
  }, [ctx.open, ctx.rootId, ctx.setOpen]);

  React.useEffect(() => {
    if (!ctx.open) return;
    const root = document.getElementById(ctx.rootId);
    if (!root) return;
    const place = () => {
      const r = root.getBoundingClientRect();
      const left =
        align === "end" ? r.right : align === "center" ? r.left + r.width / 2 : r.left;
      setCoords({
        position: "fixed",
        top: r.bottom + 4,
        left,
        transform: align === "end" ? "translateX(-100%)" : align === "center" ? "translateX(-50%)" : undefined,
        minWidth: r.width,
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
  }, [ctx.open, align, ctx.rootId]);

  if (!mounted || typeof document === "undefined") return null;

  function handleListKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const count = menuRef.current
      ? menuRef.current.querySelectorAll('[role="option"]:not([data-disabled])').length
      : 0;
    if (count === 0) return;
    let idx = ctx.activeIndex;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        idx = (idx + 1) % count;
        ctx.setActiveIndex(idx);
        ctx.focusActive();
        break;
      case "ArrowUp":
        e.preventDefault();
        idx = (idx - 1 + count) % count;
        ctx.setActiveIndex(idx);
        ctx.focusActive();
        break;
      case "Home":
        e.preventDefault();
        ctx.setActiveIndex(0);
        ctx.focusActive();
        break;
      case "End":
        e.preventDefault();
        ctx.setActiveIndex(count - 1);
        ctx.focusActive();
        break;
      case "Enter":
      case " ":
      case "Spacebar": {
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll<HTMLDivElement>('[role="option"]');
        const el = items?.[ctx.activeIndex];
        const value = el?.getAttribute("data-value");
        if (value) ctx.onItemSelect(value);
        break;
      }
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
      role="listbox"
      tabIndex={-1}
      data-slot="select-content"
      hidden={!ctx.open}
      onKeyDown={handleListKeyDown}
      className={cn(
        "max-h-72 overflow-auto rounded-box border border-base-300 bg-base-100 p-1 text-base-content shadow-sm outline-none",
        ctx.open ? "block animate-[fadeIn_0.12s_ease]" : "hidden",
        className,
      )}
      style={coords}
    >
      <SelectScrollUpButton />
      <div className="p-0">{children}</div>
      <SelectScrollDownButton />
    </div>,
    document.body,
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("px-2 py-1.5 text-sm font-semibold", className)} {...props} />
  );
}

function SelectItem({
  className,
  children,
  value,
  disabled,
  ...props
}: Omit<React.ComponentProps<"div">, "disabled"> & {
  value: string;
  disabled?: boolean;
}) {
  const ctx = useSelectContext("SelectItem");
  const ref = React.useRef<HTMLDivElement | null>(null);
  const selected = ctx.value === value;

  React.useLayoutEffect(() => {
    if (ref.current) {
      ctx.registerLabel(value, ref.current.textContent ?? "");
    }
  }, [value, ctx]);

  React.useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const unregister = ctx.registerItem({ value, element: el });
    return unregister;
  }, [value, ctx]);

  // Keep this option scrolled into view when it becomes the active one.
  React.useEffect(() => {
    if (ref.current && ctx.activeIndex >= 0) {
      const items = Array.from(
        ref.current.parentElement?.parentElement?.querySelectorAll<HTMLDivElement>(
          '[role="option"]',
        ) ?? [],
      );
      if (items[ctx.activeIndex] === ref.current) {
        ref.current.scrollIntoView({ block: "nearest" });
      }
    }
  }, [ctx.activeIndex]);

  function handleItemKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Delegate to the listbox by bubbling; but also allow Enter here for safety.
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) ctx.onItemSelect(value);
    }
  }

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled}
      data-disabled={disabled ? "" : undefined}
      data-value={value}
      data-slot="select-item"
      tabIndex={-1}
      onClick={() => !disabled && ctx.onItemSelect(value)}
      onKeyDown={handleItemKeyDown}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-base-200 hover:bg-base-200 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        selected && "bg-base-200 font-medium",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center" aria-hidden="true">
        {selected && <Check className="size-4 text-primary" />}
      </span>
      {children}
    </div>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("-mx-1 my-1 h-px bg-base-300", className)} {...props} />
  );
}

function SelectScrollUpButton() {
  return (
    <div className="flex cursor-default items-center justify-center py-0.5 text-base-content/40" aria-hidden="true">
      <ChevronUp className="size-3.5" />
    </div>
  );
}
function SelectScrollDownButton() {
  return (
    <div className="flex cursor-default items-center justify-center py-0.5 text-base-content/40" aria-hidden="true">
      <ChevronDown className="size-3.5" />
    </div>
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
