// Lightweight monitoring wrapper. No external deps required; import and use safely.
type Err = unknown;

const enabled = !!process.env.SENTRY_DSN;

export function captureException(err: Err) {
   if (!enabled) return;
   try {
      // Dynamically require to avoid hard dependency when DSN not set
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sentry = require("@sentry/node");
      Sentry.captureException(err);
   } catch (e) {
      // swallow
      // eslint-disable-next-line no-console
      console.warn("Sentry captureException failed", e);
   }
}

export function captureMessage(msg: string) {
   if (!enabled) return;
   try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sentry = require("@sentry/node");
      Sentry.captureMessage(msg);
   } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Sentry captureMessage failed", e);
   }
}

export function startTransaction(name: string) {
   if (!enabled) return { finish: () => {} };
   try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sentry = require("@sentry/node");
      const tx = Sentry.startTransaction({ name });
      return tx;
   } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Sentry startTransaction failed", e);
      return { finish: () => {} };
   }
}

export default { captureException, captureMessage, startTransaction };
