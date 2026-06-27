"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

interface SelectContextValue {
  value: string | undefined;
  onItemSelect: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled: boolean | undefined;
  rootId: string;
  registerLabel: (value: string, label: string) => void;
  getLabel: (value: string) => string | undefined;
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
  const [, forceRender] = React.useReducer((n) => n + 1, 0);
  const rootId = React.useId();

  const registerLabel = React.useCallback((val: string, label: string) => {
    if (labelsRef.current[val] !== label) {
      labelsRef.current[val] = label;
      forceRender();
    }
  }, []);

  const onItemSelect = React.useCallback(
    (val: string) => {
      if (!isControlled) setInternal(val);
      onValueChange?.(val);
      setOpen(false);
    },
    [isControlled, onValueChange],
  );

  const getLabel = React.useCallback(
    (val: string) => labelsRef.current[val],
    [],
  );

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
  return (
    <button
      type="button"
      data-slot="select-trigger"
      aria-haspopup="listbox"
      aria-expanded={ctx.open}
      disabled={ctx.disabled}
      onClick={() => ctx.setOpen(!ctx.open)}
      className={cn(
        "input input-bordered flex h-11 w-full items-center justify-between gap-2 bg-base-100 pr-3 text-left text-base-content",
        ctx.disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="size-4 shrink-0 opacity-50" />
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

  return createPortal(
    <div
      ref={menuRef}
      role="listbox"
      data-slot="select-content"
      hidden={!ctx.open}
      className={cn(
        "max-h-72 overflow-auto rounded-box border border-base-300 bg-base-100 p-1 text-base-content shadow-lg",
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

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled}
      data-disabled={disabled ? "" : undefined}
      data-slot="select-item"
      onClick={() => !disabled && ctx.onItemSelect(value)}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-base-200 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        selected && "bg-base-200 font-medium",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
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
    <div className="flex cursor-default items-center justify-center py-0.5 text-base-content/40">
      <ChevronUp className="size-3.5" />
    </div>
  );
}
function SelectScrollDownButton() {
  return (
    <div className="flex cursor-default items-center justify-center py-0.5 text-base-content/40">
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
