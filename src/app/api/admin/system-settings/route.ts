import { NextRequest, NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

export async function GET() {
   try {
      await requireActor(ROLES.STAF_IW);

      const admin = createAdminClient();
      const { data, error } = await admin
         .from("system_settings")
         .select("*")
         .order("category", { ascending: true })
         .order("key", { ascending: true });

      if (error) {
         return NextResponse.json(
            { message: sanitizeDbError(error) },
            { status: 500 },
         );
      }

      return NextResponse.json({ data: data ?? [] });
   } catch (error) {
      return actorErrorHandler(error);
   }
}

export async function PUT(request: NextRequest) {
   try {
      const actor = await requireActor(ROLES.STAF_IW);

      const body = await request.json();
      const items: Array<{ key: string; value: string }> = Array.isArray(body)
         ? body
         : Array.isArray(body.items)
           ? body.items
           : [];

      if (items.length === 0) {
         return NextResponse.json(
            { message: "Tidak ada item untuk diperbarui" },
            { status: 400 },
         );
      }

      const admin = createAdminClient();
      const updates: Array<{ key: string; value: string }> = [];

      for (const item of items) {
         if (typeof item.key !== "string" || typeof item.value !== "string") {
            continue;
         }
         const { error } = await admin
            .from("system_settings")
            .update({
               value: item.value,
               updated_by: actor.user.id,
            })
            .eq("key", item.key);

          if (error) {
             return NextResponse.json(
               { message: `Gagal memperbarui ${item.key}: ${sanitizeDbError(error, "system-settings update")}` },
               { status: 500 },
            );
          }
         updates.push({ key: item.key, value: item.value });
      }

      if (updates.length > 0) {
         await logActivity(
            "UPDATE_SETTINGS",
            `Perbarui pengaturan sistem: ${updates.map((u) => u.key).join(", ")}`,
            { updated_keys: updates.map((u) => u.key) },
            { actorUserId: actor.user.id },
         );
      }

      return NextResponse.json({ success: true, updated: updates.length });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
