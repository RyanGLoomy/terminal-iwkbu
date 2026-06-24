import { createAdminClient } from "@/lib/supabase/admin";

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
   } catch (error) {
      console.error("[createNotification] Failed:", error);
   }
}
