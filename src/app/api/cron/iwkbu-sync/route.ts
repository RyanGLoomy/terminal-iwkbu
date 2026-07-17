import { NextRequest, NextResponse } from "next/server";
import { executeIwkbuSync } from "@/lib/supabase/queries/iwkbu-sync.server";
import { isCronAuthorized } from "@/lib/auth/cron-auth";
import { sanitizeDbError } from "@/lib/db-error";

export async function POST(request: NextRequest) {
   try {
      if (!isCronAuthorized(request)) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const result = await executeIwkbuSync({
         triggerType: "scheduled",
         initiatedBy: null,
      });

      return NextResponse.json({ data: result });
   } catch (error: unknown) {
      return NextResponse.json(
         { message: sanitizeDbError(error, "iwkbu-sync") },
         { status: 500 },
      );
   }
}
