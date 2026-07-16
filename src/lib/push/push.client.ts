"use client";
import { getVapidPublicKey, urlBase64ToUint8Array } from "./vapid";

/**
 * Subscribe the current browser to web push notifications.
 * No-op if VAPID keys are not configured or SW is not supported.
 *
 * @returns PushSubscription if successful, null otherwise.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
   const vapidKey = getVapidPublicKey();
   if (!vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return null;
   }

   const permission = await Notification.requestPermission();
   if (permission !== "granted") return null;

   const reg = await navigator.serviceWorker.ready;

   // Check existing subscription
   const existing = await reg.pushManager.getSubscription();
   if (existing) {
      await syncSubscriptionToServer(existing);
      return existing;
   }

   const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
   });

   await syncSubscriptionToServer(sub);
   return sub;
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
   if (!("serviceWorker" in navigator)) return false;

   const reg = await navigator.serviceWorker.ready;
   const sub = await reg.pushManager.getSubscription();
   if (!sub) return true;

   const endpoint = sub.endpoint;
   await sub.unsubscribe();

   // Notify server to remove subscription
   try {
      await fetch("/api/push/unsubscribe", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ endpoint }),
      });
   } catch {
      // Best-effort
   }

   return true;
}

/**
 * Check if push is currently supported and subscribed.
 */
export async function isPushSubscribed(): Promise<boolean> {
   if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
   const reg = await navigator.serviceWorker.ready;
   const sub = await reg.pushManager.getSubscription();
   return !!sub;
}

/**
 * Check if push is available (VAPID configured + browser supports it).
 */
export function isPushAvailable(): boolean {
   return (
      !!getVapidPublicKey() &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
   );
}

async function syncSubscriptionToServer(sub: PushSubscription): Promise<void> {
   const keys = sub.toJSON().keys;
   if (!keys?.p256dh || !keys?.auth) return;

   await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
         endpoint: sub.endpoint,
         keys: { p256dh: keys.p256dh, auth: keys.auth },
      }),
   });
}
