"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface JRBrandProps {
   /** Size in px — controls both the logo mark and text scaling */
   size?: "sm" | "md" | "lg";
   /** Show the wordmark text next to the logo */
   showText?: boolean;
   /** Layout: horizontal (logo + text side by side) or stacked (logo on top, text below) */
   orientation?: "horizontal" | "stacked";
   /** Collapse to logo-only (overrides showText) */
   iconOnly?: boolean;
   className?: string;
}

const sizeMap = {
   sm: { logo: 24, title: "text-xs", subtitle: "text-[10px]", gap: "gap-2" },
   md: { logo: 32, title: "text-sm", subtitle: "text-[11px]", gap: "gap-2.5" },
   lg: { logo: 64, title: "text-xl", subtitle: "text-xs", gap: "gap-3" },
};

/**
 * JR (Jasa Raharja) brand identity component.
 * Renders the JR logo mark (icon-only, no wordmark baked into the image)
 * with optional text label. Used in sidebar, login page, mobile topbar.
 */
export function JRBrand({
   size = "md",
   showText = true,
   orientation = "horizontal",
   iconOnly = false,
   className,
}: JRBrandProps) {
   const s = sizeMap[size];
   const showWordmark = showText && !iconOnly;

   if (orientation === "stacked") {
      return (
         <div className={cn("flex flex-col items-center", s.gap, className)}>
            <Image
               src="/jr-mark.png"
               alt="Logo Jasa Raharja"
               width={s.logo}
               height={s.logo}
               priority
               className="object-contain"
            />
            {showWordmark && (
               <div className="text-center leading-tight">
                  <span className={cn("block font-bold tracking-tight text-base-content", s.title)}>
                     IWKBU Terminal
                  </span>
                  <span className={cn("font-semibold uppercase tracking-widest text-base-content/50", s.subtitle)}>
                     Jasa Raharja
                  </span>
               </div>
            )}
         </div>
      );
   }

   return (
      <div className={cn("flex items-center", s.gap, className)}>
         <Image
            src="/jr-mark.png"
            alt="Logo Jasa Raharja"
            width={s.logo}
            height={s.logo}
            priority
            className="shrink-0 object-contain"
         />
         {showWordmark && (
            <div className="min-w-0 leading-tight">
               <span className={cn("block truncate font-bold tracking-tight text-base-content", s.title)}>
                  IWKBU Terminal
               </span>
               <span className={cn("font-semibold uppercase tracking-wider text-base-content/50", s.subtitle)}>
                  Jasa Raharja
               </span>
            </div>
         )}
      </div>
   );
}
