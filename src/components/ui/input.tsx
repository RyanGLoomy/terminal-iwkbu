import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "input input-bordered h-11 w-full bg-base-100 text-base-content",
        "aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/30",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
