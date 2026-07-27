import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const LottieIcon = dynamic(
   () => import("@/components/ui/lottie-icon").then((m) => m.LottieIcon),
   { ssr: false },
);

import loadingDots from "@/lib/lottie/loading-dots.json";

interface LoadingStateProps {
   variant?: "spinner" | "table" | "cards" | "inline";
   count?: number;
   text?: string;
   className?: string;
}

function LoadingState({
   variant = "spinner",
   count = 5,
   text = "Memuat data…",
   className,
}: LoadingStateProps) {
   if (variant === "spinner") {
      return (
         <div
            className={cn(
                "flex items-center justify-center gap-3 py-12 text-base-content/70",
                className,
            )}
         >
             <LottieIcon animation={loadingDots} size={40} loop autoplay />
             <span className="text-sm">{text}</span>
         </div>
      );
   }

   if (variant === "inline") {
      return (
         <div className={cn("flex items-center justify-center gap-2 py-4", className)}>
            <LottieIcon animation={loadingDots} size={24} loop autoplay />
            <span className="text-sm text-base-content/70">{text}</span>
         </div>
      );
   }

   if (variant === "table") {
      return (
         <div className={cn("space-y-3", className)}>
             {Array.from({ length: count }).map((_, i) => (
                 <div key={i} className="flex items-center gap-4 px-4">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-24 tabular-nums" />
                    <Skeleton className="h-4 w-20 tabular-nums" />
                    <Skeleton className="h-8 w-16 tabular-nums" />
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
                 <div key={i} className="rounded-xl border border-base-300 p-6 space-y-3">
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
