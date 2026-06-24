import { NextRequest, NextResponse } from "next/server";
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

      const { error } = await supabase
         .from("profiles")
         .update(updateData)
         .eq("id", actor.user.id);

      if (error) {
         return NextResponse.json({ message: error.message }, { status: 500 });
      }

      await logActivity(
         "UPDATE_USER",
         `Perbarui profil: ${fullName || "(dikosongkan)"}`,
         { full_name: fullName ?? null },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ success: true });
   } catch (error: any) {
      return NextResponse.json(
         { message: error?.message ?? "Internal error" },
         { status: 500 },
      );
   }
}
