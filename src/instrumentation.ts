/**
 * Next.js instrumentation hook — runs once on server startup.
 * Enables server-side Sentry error capture for API routes and Server Components.
 * No-ops if SENTRY_DSN is not set.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.SENTRY_DSN) {
      const Sentry = await import("@sentry/node");
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 0.05,
      });
    }
  }
}
