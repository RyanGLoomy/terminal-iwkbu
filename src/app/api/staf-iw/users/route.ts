import { NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";

export async function GET() {
   try {
      await requireActor(ROLES.STAF_IW);

      const admin = createAdminClient();
      const { data, error } = await admin
         .from("profiles")
         .select(
            "id, email, full_name, is_active, terminal_id, user_roles(role:roles(id, name))",
         )
         .order("created_at", { ascending: false });

      if (error) {
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

      return NextResponse.json({ data: data ?? [] });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
