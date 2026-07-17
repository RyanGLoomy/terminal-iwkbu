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

/**
 * Kirim notifikasi ke semua user dengan role tertentu.
 * Menggunakan join user_roles + profiles untuk resolve target users.
 */
export async function createNotificationForRole(
   role: string,
   params: {
      title: string;
      message: string;
      type?: "info" | "success" | "warning" | "error";
      link?: string;
   },
) {
   try {
      const admin = createAdminClient();

      const { data: roleRow } = await admin
         .from("roles")
         .select("id")
         .eq("name", role)
         .single();

      if (!roleRow) return;

      const { data: userRoles } = await admin
         .from("user_roles")
         .select("user_id")
         .eq("role_id", roleRow.id);

      if (!userRoles || userRoles.length === 0) return;

      const notifications = userRoles.map((ur: { user_id: string }) => ({
         user_id: ur.user_id,
         title: params.title,
         message: params.message,
         type: params.type ?? "info",
         link: params.link,
      }));

      await admin.from("notifications").insert(notifications);

      for (const ur of userRoles) {
         sendPushToUser(ur.user_id, {
            title: params.title,
            body: params.message,
            url: params.link ?? undefined,
         }).catch((e) => {
            console.error("[createNotificationForRole] Push failed:", e);
         });
      }
   } catch (error) {
      console.error("[createNotificationForRole] Failed:", error);
   }
}
