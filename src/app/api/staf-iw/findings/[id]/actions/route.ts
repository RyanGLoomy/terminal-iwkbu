import { NextRequest, NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import { createNotification } from "@/lib/supabase/queries/notifications.server";

export async function POST(
   request: NextRequest,
   context: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await requireActor(ROLES.STAF_IW);

      const { id } = await context.params;
      const body = await request.json();
      const actionText = (body?.actionText as string | undefined)?.trim();

      if (!actionText) {
         return NextResponse.json(
            { message: "Teks tindakan wajib diisi" },
            { status: 400 },
         );
      }

      const admin = createAdminClient();

       const { data: finding } = await admin
          .from("findings")
          .select("id, status, po_id, judul, nomor_polisi")
          .eq("id", id)
          .single();

      if (!finding) {
         return NextResponse.json(
            { message: "Temuan tidak ditemukan" },
            { status: 404 },
         );
      }

      const { data, error } = await admin
         .from("finding_actions")
         .insert({
            finding_id: id,
            action_text: actionText,
            status: "open",
            created_by: actor.user.id,
         })
         .select(
            "id, finding_id, action_text, status, done_at, done_by, created_by, created_at",
         )
         .single();

      if (error) {
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

      await logActivity(
         "TAMBAH_TINDAKAN",
         "Menambahkan tindak lanjut pada temuan",
         {
            finding_id: id,
            action_id: data.id,
            action_text: data.action_text,
         },
          { actorUserId: actor.user.id },
       );

       if (finding?.po_id) {
          await createNotification({
             userId: finding.po_id,
             title: "Tindak Lanjut Ditambahkan",
             message: `Tindakan baru untuk temuan armada ${finding.nomor_polisi}: ${data.action_text}`,
             type: "info",
             link: "/po/temuan",
          });
       }

      return NextResponse.json({ data }, { status: 201 });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
