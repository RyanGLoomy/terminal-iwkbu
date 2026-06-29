import { NextRequest, NextResponse } from "next/server";
import { executeIwkbuSync } from "@/lib/supabase/queries/iwkbu-sync.server";
import { safeCompare } from "@/lib/auth/safe-compare";
import { sanitizeDbError } from "@/lib/db-error";

function isAuthorized(request: NextRequest) {
   const secret =
      process.env.IWKBU_SYNC_CRON_SECRET ?? process.env.CRON_SECRET ?? "";
   if (!secret) return false;

   const authHeader = request.headers.get("authorization") ?? "";
   const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

   return safeCompare(bearer, secret);
}

export async function POST(request: NextRequest) {
   try {
      if (!isAuthorized(request)) {
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
