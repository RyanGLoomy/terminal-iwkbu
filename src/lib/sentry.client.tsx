// Sentry dimuat secara lazy agar SDK browser tidak masuk bundle utama
// (dimasukkan ke chunk terpisah, hanya dimuat saat DSN tersedia).
export async function initSentryClient() {
   const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
   if (!dsn) return;
   const Sentry = await import("@sentry/react");
   Sentry.init({
      dsn,
      tracesSampleRate: Number(
         process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.05,
      ),
   });
}
