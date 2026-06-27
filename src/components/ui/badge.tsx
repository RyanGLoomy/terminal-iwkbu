import * as React from "react";
import { cn } from "@/lib/utils";
import { Slot } from "@/lib/slot";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";

const VARIANTS: Record<BadgeVariant, string> = {
  default: "badge-primary",
  secondary: "badge-secondary",
  destructive: "badge-error",
  outline: "badge-outline",
  ghost: "badge-ghost",
  link: "badge-ghost underline underline-offset-4",
};

interface BadgeVariantsArgs {
  variant?: BadgeVariant;
  className?: string;
}

export function badgeVariants({
  variant = "default",
  className,
}: BadgeVariantsArgs = {}) {
  return cn("badge gap-1 font-medium", VARIANTS[variant], className);
}

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & {
  variant?: BadgeVariant;
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={badgeVariants({ variant, className })}
      {...props}
    />
  );
}

export { Badge };
