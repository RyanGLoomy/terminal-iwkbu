import { NextResponse } from "next/server";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { getRekonsiliasiData } from "@/lib/supabase/queries/rekonsiliasi.server";

export async function GET() {
   try {
      await requireActor(ROLES.STAF_IW);

      const data = await getRekonsiliasiData();

      return NextResponse.json({ data });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
