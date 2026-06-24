"use client";
import { useEffect } from "react";
import { initSentryClient } from "@/lib/sentry.client";

export default function SentryInit() {
   useEffect(() => {
      try {
         initSentryClient();
      } catch (e) {
         // ignore
         // eslint-disable-next-line no-console
         console.warn("Sentry client init failed", e);
      }
   }, []);

   return null;
}
