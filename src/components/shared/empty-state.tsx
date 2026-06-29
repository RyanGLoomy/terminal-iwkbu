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
            "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-base-300 px-6 py-12 text-center",
            className,
         )}
      >
         <div className="flex size-12 items-center justify-center rounded-full bg-base-200">
            {Icon ? (
               <Icon className="size-6 text-base-content/70" aria-hidden="true" />
            ) : (
               <DefaultIcon className="size-6 text-base-content/70" aria-hidden="true" />
            )}
         </div>
         <div className="space-y-1">
            <p className="font-semibold text-sm text-base-content">{title}</p>
            {description && (
               <p className="text-sm text-base-content/70 max-w-sm">
                  {description}
               </p>
            )}
         </div>
         {action && <div className="mt-2">{action}</div>}
      </div>
   );
}

export { EmptyState };
