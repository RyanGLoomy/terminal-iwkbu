import * as React from "react";
import { type LucideIcon, Inbox, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
   icon?: LucideIcon;
   title: string;
   description?: string;
   action?: React.ReactNode;
   className?: string;
   variant?: "default" | "search";
}

function EmptyState({
   icon: Icon,
   title,
   description,
   action,
   className,
   variant = "default",
}: EmptyStateProps) {
   const DefaultIcon = variant === "search" ? SearchX : Inbox;

   return (
      <div
         className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center",
            className,
         )}
      >
         <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            {Icon ? (
               <Icon className="size-6 text-muted-foreground" />
            ) : (
               <DefaultIcon className="size-6 text-muted-foreground" />
            )}
         </div>
         <div className="space-y-1">
            <p className="font-semibold text-sm text-foreground">{title}</p>
            {description && (
               <p className="text-sm text-muted-foreground max-w-sm">
                  {description}
               </p>
            )}
         </div>
         {action && <div className="mt-2">{action}</div>}
      </div>
   );
}

export { EmptyState };
