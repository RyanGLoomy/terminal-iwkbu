import * as React from "react";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
   variant?: "spinner" | "table" | "cards" | "inline";
   count?: number;
   text?: string;
   className?: string;
}

function LoadingState({
   variant = "spinner",
   count = 5,
   text = "Memuat data...",
   className,
}: LoadingStateProps) {
   if (variant === "spinner") {
      return (
         <div
            className={cn(
               "flex items-center justify-center gap-3 py-12 text-muted-foreground",
               className,
            )}
         >
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">{text}</span>
         </div>
      );
   }

   if (variant === "inline") {
      return (
         <div className={cn("flex items-center justify-center gap-2 py-4", className)}>
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{text}</span>
         </div>
      );
   }

   if (variant === "table") {
      return (
         <div className={cn("space-y-3", className)}>
            {Array.from({ length: count }).map((_, i) => (
               <div key={i} className="flex items-center gap-4 px-4">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
               </div>
            ))}
         </div>
      );
   }

   if (variant === "cards") {
      return (
         <div
            className={cn(
               "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
               className,
            )}
         >
            {Array.from({ length: count }).map((_, i) => (
               <div key={i} className="rounded-xl border border-border p-6 space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-24" />
               </div>
            ))}
         </div>
      );
   }

   return null;
}

export { LoadingState };
