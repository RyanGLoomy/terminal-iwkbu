"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Tooltip berbasis CSS DaisyUI (.tooltip + data-tip).
 * Menyimpan teks dari <TooltipContent> dan posisi `side` lewat context,
 * lalu membungkus trigger dengan elemen .tooltip.
 */
interface TooltipContextValue {
  tip: string;
  setTip: (tip: string) => void;
  side: string;
  setSide: (side: string) => void;
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function TooltipProvider({
  children,
  delayDuration: _delayDuration,
}: {
  children?: React.ReactNode;
  delayDuration?: number;
}) {
  return <>{children}</>;
}

function Tooltip({ children }: { children?: React.ReactNode }) {
  const [tip, setTip] = React.useState("");
  const [side, setSide] = React.useState("top");
  const sideClass =
    side === "right"
      ? "tooltip-right"
      : side === "left"
        ? "tooltip-left"
        : side === "bottom"
          ? "tooltip-bottom"
          : "tooltip-top";
  return (
    <TooltipContext.Provider value={{ tip, setTip, side, setSide }}>
      <span
        className={cn("tooltip", tip && sideClass, !tip && "tooltip-hidden")}
        data-tip={tip}
      >
        {children}
      </span>
    </TooltipContext.Provider>
  );
}

function TooltipTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  // Trigger cukup meneruskan anaknya; data-tip ada di pembungkus <Tooltip>.
  void asChild;
  if (React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, props);
  }
  return <button type="button" {...props}>{children}</button>;
}

function TooltipContent({
  children,
  side = "top",
  sideOffset: _sideOffset,
}: {
  children?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
}) {
  const ctx = React.useContext(TooltipContext);
  React.useEffect(() => {
    ctx?.setSide(side);
  }, [side, ctx]);
  React.useEffect(() => {
    ctx?.setTip(typeof children === "string" ? children : "");
  }, [children, ctx]);
  return null;
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
