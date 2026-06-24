import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
   return (
      <textarea
         data-slot="textarea"
         className={cn(
             "flex min-h-[96px] w-full rounded-xl border-2 border-input bg-card px-3.5 py-3 text-base text-foreground shadow-elevation-1 outline-none transition-[color,box-shadow,border-color,background-color] placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-card/70 focus-visible:border-brand-sky focus-visible:ring-brand-sky/25 focus-visible:ring-[4px] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
             className,
         )}
         {...props}
      />
   );
}

export { Textarea };
