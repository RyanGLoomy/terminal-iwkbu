"use client";
import { useEffect } from "react";

/**
 * Registers the service worker on the client.
 * Follows the same pattern as SentryInit — lazy, gated, no-op if unsupported.
 */
export function SWRegister() {
   useEffect(() => {
      if (
         typeof window === "undefined" ||
         !("serviceWorker" in navigator) ||
         process.env.NODE_ENV !== "production"
      ) {
         return;
      }
      navigator.serviceWorker
         .register("/sw.js")
         .catch(() => {
            // Silent fail — SW is a progressive enhancement
         });
   }, []);
   return null;
}
