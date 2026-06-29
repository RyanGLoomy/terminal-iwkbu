import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import {
   submitClarification,
   FindingClosedError,
   InvalidClarificationError,
   type ClarificationDecision,
} from "@/lib/findings/lifecycle";

export async function POST(
   request: NextRequest,
   context: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await requireActor(ROLES.PO);

      const { id } = await context.params;
      const formData = await request.formData();
      const decision = (formData.get("decision") as string | null) ?? undefined;
      const message = (
         (formData.get("message") as string | null) ?? ""
      ).trim();
      const evidenceLink = (
         (formData.get("evidenceLink") as string | null) ?? ""
      ).trim() || undefined;
      const evidenceFile = formData.get("evidenceFile") as File | null;

      if (
         !decision ||
         !["menerima", "menolak", "melengkapi"].includes(decision)
      ) {
         return NextResponse.json(
            { message: "Keputusan klarifikasi tidak valid" },
            { status: 400 },
         );
      }

      if (!message) {
         return NextResponse.json(
            { message: "Pesan klarifikasi wajib diisi" },
            { status: 400 },
         );
      }

      const admin = createAdminClient();
      const { data: finding, error: findingError } = await admin
         .from("findings")
         .select("id, po_id, status, created_by, judul, nomor_polisi")
         .eq("id", id)
         .eq("po_id", actor.user.id)
         .single();

      if (findingError || !finding) {
         return NextResponse.json(
            { message: "Temuan tidak ditemukan" },
            { status: 404 },
         );
      }

      const result = await submitClarification({
         actor,
         responder: "po",
         finding,
         decision: decision as ClarificationDecision,
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
