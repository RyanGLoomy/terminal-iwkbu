"use client";

import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { IconWifi, IconWifiOff } from "@tabler/icons-react";

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
                <IconWifi className="h-3.5 w-3.5 text-brand-green" aria-hidden="true" />
               <span className="hidden text-base-content/60 sm:inline">Online</span>
            </>
         ) : (
            <>
                <IconWifiOff className="h-3.5 w-3.5 text-error" aria-hidden="true" />
               <span className="text-error font-medium">Offline</span>
            </>
         )}
      </span>
   );
}
