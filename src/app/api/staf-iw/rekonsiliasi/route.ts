import { NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { getRekonsiliasiData } from "@/lib/supabase/queries/rekonsiliasi.server";

export async function GET() {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json(
            { message: "Unauthorized" },
            { status: 401 },
         );
      }

      if (actor.role !== "staf-iw") {
         return NextResponse.json(
            { message: "Forbidden" },
            { status: 403 },
         );
      }

      const data = await getRekonsiliasiData();

      return NextResponse.json({ data });
   } catch (error: any) {
      console.error("[API /rekonsiliasi] Error:", error?.message);
      return NextResponse.json(
         { message: error?.message ?? "Internal error" },
         { status: 500 },
      );
   }
}
