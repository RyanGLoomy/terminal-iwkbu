import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Slot sederhana sebagai pengganti Radix Slot.
 * - Menggabungkan className dari Slot dan anak.
 * - Menyusun (compose) handler yang berawalan "on" agar event dari kedua
 *   sisi tetap berjalan (mis. menutup menu + navigasi Link).
 */
export type SlotProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
};

function composeHandlers(
  slot: unknown,
  child: unknown,
): ((...args: unknown[]) => void) | undefined {
  if (typeof slot !== "function") return child as never;
  if (typeof child !== "function") return slot as never;
  return (...args: unknown[]) => {
    const result = (slot as (...a: unknown[]) => unknown)(...args);
    if (typeof result === "boolean" && !result) return;
    (child as (...a: unknown[]) => unknown)(...args);
  };
}

export function Slot({ children, ...props }: SlotProps) {
  if (React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = child.props;
    const merged: Record<string, unknown> = { ...props };
    for (const key of Object.keys(childProps)) {
      const cv = childProps[key];
      const sv = (props as Record<string, unknown>)[key];
      if (key === "className") {
        merged[key] = cn(
          typeof sv === "string" ? sv : undefined,
          typeof cv === "string" ? cv : undefined,
        );
      } else if (key.startsWith("on") && typeof cv === "function") {
        merged[key] = composeHandlers(sv, cv);
      } else {
        merged[key] = cv;
      }
    }
    const childClassName =
      typeof childProps.className === "string" ? childProps.className : undefined;
    merged.className = cn(
      typeof props.className === "string" ? props.className : undefined,
      childClassName,
    );
    return React.cloneElement(child, merged);
  }
  return null;
}
