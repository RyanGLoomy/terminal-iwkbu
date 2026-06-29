import { NextRequest, NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

export async function PATCH(request: NextRequest) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json(
            { message: "Unauthorized" },
            { status: 401 },
         );
      }

      const body = await request.json();
      const fullName = (body?.full_name as string | undefined)?.trim();

      if (fullName !== undefined && fullName !== null) {
         if (fullName.length > 255) {
            return NextResponse.json(
               { message: "Nama lengkap maksimal 255 karakter." },
               { status: 400 },
            );
         }
      }

      const supabase = await createClient();

      const updateData: Record<string, string | null> = {
         updated_at: new Date().toISOString(),
      };

      if (fullName !== undefined && fullName !== null) {
         updateData.full_name = fullName || null;
      }

      // Only full_name/updated_at are ever written here. terminal_id / is_active /
      // email are intentionally never set by this route (RLS-01: those columns
      // drive authorization scope and must only change via service-role admin
      // routes). The DB also enforces a BEFORE UPDATE trigger as backstop.
      const { error } = await supabase
         .from("profiles")
         .update(updateData)
         .eq("id", actor.user.id);

      if (error) {
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

      await logActivity(
         "UPDATE_USER",
         `Perbarui profil: ${fullName || "(dikosongkan)"}`,
         { full_name: fullName ?? null },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
       return NextResponse.json(
          { message: sanitizeDbError(error, "profile") },
          { status: 500 },
       );
    }
}
