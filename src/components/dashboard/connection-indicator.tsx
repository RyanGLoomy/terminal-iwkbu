"use client";

import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { IconWifi, IconWifiOff } from "@tabler/icons-react";

export function ConnectionIndicator() {
   const { isOnline } = useOnlineStatus();

   return (
      <span
         className={`navbar-icon-btn ${!isOnline ? "status-offline" : ""}`}
         title={isOnline ? "Terhubung" : "Koneksi terputus"}
         role="status"
         aria-label={isOnline ? "Online" : "Offline"}
      >
         {isOnline ? (
            <IconWifi className="h-4 w-4 text-brand-green" aria-hidden="true" />
         ) : (
            <IconWifiOff className="h-4 w-4 text-error" aria-hidden="true" />
         )}
      </span>
   );
}
