import { NextRequest, NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";

export async function GET(
   _request: NextRequest,
   context: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await requireActor(ROLES.PO);

      const { id } = await context.params;
      const admin = createAdminClient();

      const { data: finding } = await admin
         .from("findings")
         .select("id, po_id")
         .eq("id", id)
         .single();

      if (!finding) {
         return NextResponse.json(
            { message: "Temuan tidak ditemukan" },
            { status: 404 },
         );
      }

      if (finding.po_id !== actor.user.id) {
         return NextResponse.json(
            { message: "Temuan bukan milik PO ini" },
            { status: 403 },
         );
      }

      const { data: actions, error } = await admin
         .from("finding_actions")
         .select(
            "id, finding_id, action_text, status, done_at, done_by, created_by, created_at",
         )
         .eq("finding_id", id)
         .order("created_at", { ascending: true });

      if (error) {
         return NextResponse.json(
            { message: sanitizeDbError(error) },
            { status: 500 },
         );
      }

      return NextResponse.json({ data: actions ?? [] });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
