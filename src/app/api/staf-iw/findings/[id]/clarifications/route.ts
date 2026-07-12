import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import {
   submitClarification,
   parseClarificationForm,
   FindingClosedError,
   InvalidClarificationError,
} from "@/lib/findings/lifecycle";

export async function POST(
   request: NextRequest,
   context: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await requireActor(ROLES.STAF_IW);

      const { id } = await context.params;
      const formData = await request.formData();
      const { decision, message, evidenceLink, evidenceFile } =
         parseClarificationForm(formData);

      const admin = createAdminClient();
      const { data: finding, error: findingError } = await admin
         .from("findings")
         .select("id, po_id, status, created_by, judul, nomor_polisi")
         .eq("id", id)
         .single();

      if (findingError || !finding) {
         return NextResponse.json(
            { message: "Temuan tidak ditemukan" },
            { status: 404 },
         );
      }

      const result = await submitClarification({
         actor,
         responder: "staf-iw",
         finding,
         decision,
         message,
         evidenceLink,
         evidenceFile,
      });

      return NextResponse.json({ data: result.clarification }, { status: 201 });
   } catch (error) {
      if (error instanceof FindingClosedError) {
         return NextResponse.json({ message: error.message }, { status: 409 });
      }
      if (error instanceof InvalidClarificationError) {
         return NextResponse.json({ message: error.message }, { status: 400 });
      }
      return actorErrorHandler(error);
   }
}
