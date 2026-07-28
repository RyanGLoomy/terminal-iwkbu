import * as React from "react";
import { IconInbox, IconSearchOff } from "@tabler/icons-react";
import type { FC, SVGProps } from "react";
type IconComponent = FC<SVGProps<SVGSVGElement> & { size?: string | number }>;
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface EmptyStateProps {
   icon?: IconComponent;
   lottieAnimation?: object;
   title: string;
   description?: string;
   action?: React.ReactNode;
   className?: string;
   variant?: "default" | "search";
}

function EmptyState({
   icon: Icon,
   lottieAnimation,
   title,
   description,
   action,
   className,
   variant = "default",
}: EmptyStateProps) {
   const DefaultIcon = variant === "search" ? IconSearchOff : IconInbox;

   return (
      <div
         className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-base-300 px-6 py-12 text-center",
            className,
         )}
      >
         <div className="flex size-12 items-center justify-center rounded-full bg-base-200">
            {lottieAnimation ? (
               <div className="dark:hue-[-172deg] dark:brightness-[1.4]">
                  <Lottie
                     animationData={lottieAnimation}
                     loop
                     autoplay
                     style={{ width: 32, height: 32 }}
                  />
               </div>
            ) : Icon ? (
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
