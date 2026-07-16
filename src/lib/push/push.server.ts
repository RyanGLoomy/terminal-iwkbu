import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVapidConfig } from "./vapid";

let initialized = false;

function ensureInit() {
   if (initialized) return;
   const config = getVapidConfig();
   if (!config) return; // graceful no-op without VAPID keys
   webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
   initialized = true;
}

interface PushPayload {
   title: string;
   body: string;
   url?: string;
   tag?: string;
}

/**
 * Send web push notifications to ALL subscribed devices for a user.
 * Fire-and-forget — failures are swallowed (best-effort delivery).
 * Expired subscriptions (410/404) are auto-deleted.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
   ensureInit();
   if (!initialized) return; // no-op without VAPID keys

   const admin = createAdminClient();

   const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, keys_p256dh, keys_auth")
      .eq("user_id", userId);

   if (!subs || subs.length === 0) return;

   const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.tag ?? "iwkbu",
   });

   await Promise.allSettled(
      subs.map(async (sub) => {
         try {
            await webpush.sendNotification(
               {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
               },
               notificationPayload,
            );
         } catch (err: unknown) {
            const statusCode =
               typeof err === "object" && err && "statusCode" in err
                  ? (err as { statusCode: number }).statusCode
                  : 0;
            // 410 Gone / 404 Not Found = subscription expired → cleanup
            if (statusCode === 410 || statusCode === 404) {
               await admin
                  .from("push_subscriptions")
                  .delete()
                  .eq("endpoint", sub.endpoint);
            }
         }
      }),
   );
}
