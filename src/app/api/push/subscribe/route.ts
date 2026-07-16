import { NextRequest, NextResponse } from "next/server";
import { sanitizeDbError } from "@/lib/db-error";
import { createClient } from "@/lib/supabase/server";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";

export async function POST(request: NextRequest) {
   try {
      await requireActor([ROLES.PO, ROLES.PETUGAS_LOKET, ROLES.ADMIN_TERMINAL, ROLES.STAF_IW]);

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
         return NextResponse.json({ message: "Sesi habis" }, { status: 401 });
      }

      const body = await request.json();
      const endpoint = body?.endpoint as string | undefined;
      const keysP256dh = body?.keys?.p256dh as string | undefined;
      const keysAuth = body?.keys?.auth as string | undefined;

      if (!endpoint || !keysP256dh || !keysAuth) {
         return NextResponse.json(
            { message: "Data subscription tidak lengkap (endpoint, keys.p256dh, keys.auth diperlukan)" },
            { status: 400 },
         );
      }

      const { error } = await supabase
         .from("push_subscriptions")
         .upsert(
            {
               user_id: user.id,
               endpoint,
               keys_p256dh: keysP256dh,
               keys_auth: keysAuth,
            },
            { onConflict: "endpoint" },
         );

      if (error) {
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

      return NextResponse.json({ success: true });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
