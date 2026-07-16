import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push/push.server";

export async function createNotification(params: {
   userId: string;
   title: string;
   message: string;
   type?: "info" | "success" | "warning" | "error";
   link?: string;
}) {
   try {
      const admin = createAdminClient();
      await admin.from("notifications").insert({
         user_id: params.userId,
         title: params.title,
         message: params.message,
         type: params.type ?? "info",
         link: params.link,
      });

      // Fire push notification (best-effort, tidak boleh block response)
      sendPushToUser(params.userId, {
         title: params.title,
         body: params.message,
         url: params.link ?? undefined,
      }).catch((e) => {
         console.error("[createNotification] Push failed:", e);
      });
   } catch (error) {
      console.error("[createNotification] Failed:", error);
   }
}
