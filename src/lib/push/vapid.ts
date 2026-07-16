/**
 * VAPID key loader and base64 conversion utilities.
 * No-op gracefully if keys are not configured.
 */

export function getVapidPublicKey(): string | null {
   return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

export function getVapidConfig() {
   const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
   const privateKey = process.env.VAPID_PRIVATE_KEY;
   const subject = process.env.VAPID_SUBJECT || "mailto:admin@jasaraharja.co.id";
   if (!publicKey || !privateKey) return null;
   return { publicKey, privateKey, subject };
}

/**
 * Convert base64url string to Uint8Array for pushManager.subscribe().
 * Required by the Push API — applicationServerKey must be a Uint8Array.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
   const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
   const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
   const rawData = typeof atob !== "undefined" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
   const output = new Uint8Array(rawData.length);
   for (let i = 0; i < rawData.length; ++i) {
      output[i] = rawData.charCodeAt(i);
   }
   return output;
}
