import * as Sentry from "@sentry/react";

export function initSentryClient() {
   const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
   if (!dsn) return;
   Sentry.init({
      dsn,
      tracesSampleRate: Number(
         process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.05,
      ),
   });
}

export default Sentry;
