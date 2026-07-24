"use client";

import { useEffect, useState } from "react";

/**
 * Tracks browser connectivity via navigator.onLine + online/offline events.
 * Returns { isOnline, wasOffline }.
 */
export function useOnlineStatus() {
   // Fixed initial value so the server-rendered HTML and the client's first
   // hydration render match exactly. Reading navigator.onLine in the
   // initializer creates a server/client branch (navigator is undefined on
   // the server) which triggers a hydration mismatch. The real status is
   // synced after mount in the effect below.
   const [isOnline, setIsOnline] = useState(true);

   useEffect(() => {
      // navigator is only available in the browser; read it here (post-mount).
      setIsOnline(navigator.onLine);

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
