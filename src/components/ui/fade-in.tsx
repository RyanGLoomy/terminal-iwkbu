"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FadeInProps {
   children: ReactNode;
   delay?: number;
   className?: string;
}

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
   return (
      <div
         className={cn("animate-fade-in-up", className)}
         style={{ animationDelay: `${delay}ms` }}
      >
         {children}
      </div>
   );
}
