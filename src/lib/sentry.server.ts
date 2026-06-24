import * as Sentry from "@sentry/node";

let initialized = false;

export function initSentryServer() {
   if (initialized) return;
   const dsn = process.env.SENTRY_DSN;
   if (!dsn) return;
   Sentry.init({
      dsn,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      environment: process.env.NODE_ENV,
   });
   initialized = true;
}

export default Sentry;
