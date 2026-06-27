import * as React from "react";

import { cn } from "@/lib/utils";

export type AlertVariant = "default" | "destructive" | "warning" | "success";

const VARIANTS: Record<AlertVariant, string> = {
  default: "alert bg-base-200 text-base-content border-base-300",
  destructive: "alert-error",
  warning: "alert-warning",
  success: "alert-success",
};

function Alert({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: AlertVariant }) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn("alert items-start", VARIANTS[variant], className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 line-clamp-1 min-h-4 font-semibold", className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "grid justify-items-start gap-1 text-sm text-base-content/70 [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
