"use client";

import { useEffect, useState } from "react";

/**
 * Tracks browser connectivity via navigator.onLine + online/offline events.
 * Returns { isOnline, wasOffline }.
 */
export function useOnlineStatus() {
   const [isOnline, setIsOnline] = useState(
      typeof navigator !== "undefined" ? navigator.onLine : true,
   );

   useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
         window.removeEventListener("online", handleOnline);
         window.removeEventListener("offline", handleOffline);
      };
   }, []);

   return { isOnline };
}
