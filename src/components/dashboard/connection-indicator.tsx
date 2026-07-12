"use client";

import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { Wifi, WifiOff } from "lucide-react";

export function ConnectionIndicator() {
   const { isOnline } = useOnlineStatus();

   return (
      <span
         className="flex items-center gap-1.5 text-xs"
         title={isOnline ? "Terhubung" : "Koneksi terputus"}
         role="status"
         aria-label={isOnline ? "Online" : "Offline"}
      >
         {isOnline ? (
            <>
               <Wifi className="h-3.5 w-3.5 text-brand-green" aria-hidden="true" />
               <span className="hidden text-base-content/60 sm:inline">Online</span>
            </>
         ) : (
            <>
               <WifiOff className="h-3.5 w-3.5 text-error" aria-hidden="true" />
               <span className="text-error font-medium">Offline</span>
            </>
         )}
      </span>
   );
}
