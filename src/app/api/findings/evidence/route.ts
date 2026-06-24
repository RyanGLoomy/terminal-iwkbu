import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import {
   ensureRoleOrThrow,
   AuthorizationError,
} from "@/lib/auth/requireRole.server";

export async function GET(request: NextRequest) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const filePath = request.nextUrl.searchParams.get("path");
      if (!filePath) {
         return NextResponse.json(
            { message: "Parameter path wajib diisi" },
            { status: 400 },
         );
      }

      if (filePath.includes("..")) {
         return NextResponse.json(
            { message: "Path tidak valid" },
            { status: 400 },
         );
      }

      const admin = createAdminClient();

      const findingId = filePath.split("/")[0];
      if (!findingId) {
         return NextResponse.json(
            { message: "Path tidak valid" },
            { status: 400 },
         );
      }

      const { data: finding } = await admin
         .from("findings")
         .select("id, po_id")
         .eq("id", findingId)
         .maybeSingle();

      if (!finding) {
         return NextResponse.json(
            { message: "File tidak ditemukan" },
            { status: 404 },
         );
      }

      try {
         ensureRoleOrThrow(actor.user, actor.profile, [
            "staf-iw",
            "admin-terminal",
         ]);
      } catch {
         if (finding.po_id !== actor.user.id) {
            return NextResponse.json(
               { message: "File tidak ditemukan" },
               { status: 404 },
            );
         }
      }

      const { data, error } = await admin.storage
         .from("finding-evidence")
         .createSignedUrl(filePath, 60);

      if (error || !data?.signedUrl) {
         return NextResponse.json(
            { message: "Gagal membuat tautan unduhan" },
            { status: 500 },
         );
      }

      return NextResponse.json({ url: data.signedUrl });
   } catch (error) {
      if (error instanceof AuthorizationError) {
         return NextResponse.json(
            { message: "Akses ditolak" },
            { status: 403 },
         );
      }
      return NextResponse.json(
         { message: "Terjadi kesalahan internal" },
         { status: 500 },
      );
   }
}
