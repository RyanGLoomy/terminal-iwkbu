import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "textarea textarea-bordered min-h-[96px] w-full bg-base-100 text-base-content",
        "aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/30",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
