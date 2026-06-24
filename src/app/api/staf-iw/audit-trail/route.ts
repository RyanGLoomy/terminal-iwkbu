import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { ensureRoleOrThrow } from "@/lib/auth/requireRole.server";
import { getActivityLogs } from "@/lib/supabase/queries/operasional.server";
import type {
   ActivityLog,
   AksiLog,
} from "@/lib/supabase/queries/operasional.types";

const ACTIONS = new Set<AksiLog>([
   "SET_PIN",
   "BUKA_SESI",
   "TUTUP_SESI",
   "INPUT_TRANSAKSI",
   "BUAT_TEMUAN",
   "UPDATE_TEMUAN",
   "KIRIM_KLARIFIKASI",
   "LOGIN",
   "LOGOUT",
   "UBAH_PASSWORD",
   "BUAT_USER",
   "UPDATE_USER",
   "BUAT_TERMINAL",
   "UPDATE_TERMINAL",
   "HAPUS_TERMINAL",
   "BUAT_JENIS_KENDARAAN",
   "UPDATE_JENIS_KENDARAAN",
   "HAPUS_JENIS_KENDARAAN",
   "UPDATE_SETTINGS",
   "IMPORT_IWKBU",
   "JALANKAN_SYNC",
   "TAMBAH_TINDAKAN",
   "SELESAIKAN_TINDAKAN",
   "BUKA_ULANG_TEMUAN",
   "BUAT_ARMADA",
   "UPDATE_ARMADA",
   "VERIFIKASI_ARMADA",
   "EDIT_PO",
]);

class QueryValidationError extends Error {
   status = 400;
   constructor(message: string) {
      super(message);
      this.name = "QueryValidationError";
   }
}

function getDateOffset(daysAgo: number) {
   const date = new Date();
   date.setDate(date.getDate() - daysAgo);
   return date.toISOString().slice(0, 10);
}

function parseDateParam(value: string | null, fallback: string, label: string) {
   const dateValue = value || fallback;
   if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      throw new QueryValidationError(`${label} harus berformat YYYY-MM-DD`);
   }

   const parsed = new Date(`${dateValue}T00:00:00.000Z`);
   if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dateValue) {
      throw new QueryValidationError(`${label} tidak valid`);
   }

   return dateValue;
}

function parseLimitParam(value: string | null) {
   if (!value) return 100;

   const limit = Number(value);
   if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new QueryValidationError("limit harus berupa angka 1-500");
   }

   return limit;
}

function parseOffsetParam(value: string | null) {
   if (!value) return 0;

   const offset = Number(value);
   if (!Number.isInteger(offset) || offset < 0) {
      throw new QueryValidationError("offset harus berupa angka non-negatif");
   }

   return offset;
}

function parseActionParam(value: string | null) {
   if (!value || value === "SEMUA") return undefined;
   if (!ACTIONS.has(value as AksiLog)) {
      throw new QueryValidationError("aksi tidak valid");
   }

   return value as AksiLog;
}

function parseSearchParam(value: string | null) {
   const search = (value ?? "").trim().toLowerCase();
   if (search.length > 100) {
      throw new QueryValidationError("Pencarian maksimal 100 karakter");
   }

   return search;
}

function filterBySearch(rows: ActivityLog[], search: string) {
   if (!search) return rows;

   return rows.filter((row) => {
      const metadata = JSON.stringify(row.metadata ?? {});
      const haystack = [
         row.user_name,
         row.aksi,
         row.deskripsi ?? "",
         metadata,
      ]
         .join(" ")
         .toLowerCase();

      return haystack.includes(search);
   });
}

export async function GET(request: NextRequest) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      try {
         ensureRoleOrThrow(actor.user, actor.profile, "staf-iw");
      } catch (error: unknown) {
         return NextResponse.json(
            { message: error instanceof Error ? error.message : "Forbidden" },
            { status: (error as { status?: number })?.status ?? 403 },
         );
      }

      const params = request.nextUrl.searchParams;
      const startDate = parseDateParam(
         params.get("startDate"),
         getDateOffset(6),
         "startDate",
      );
      const endDate = parseDateParam(
         params.get("endDate"),
         getDateOffset(0),
         "endDate",
      );
      if (startDate > endDate) {
         throw new QueryValidationError("startDate tidak boleh setelah endDate");
      }

      const aksi = parseActionParam(params.get("aksi"));
      const limit = parseLimitParam(params.get("limit"));
      const offset = parseOffsetParam(params.get("offset"));
      const search = parseSearchParam(params.get("q") ?? params.get("search"));

      const fetchLimit = search ? limit + 1 : limit;
      const rows = await getActivityLogs({
         startDate,
         endDate,
         aksi,
         limit: fetchLimit,
         offset,
      });
      const filtered = filterBySearch(rows, search);

      let hasMore = false;
      let resultRows = filtered;
      if (search) {
         if (filtered.length > limit) {
            hasMore = true;
            resultRows = filtered.slice(0, limit);
         }
      } else if (rows.length === fetchLimit) {
         hasMore = true;
      }

      return NextResponse.json({ data: resultRows, hasMore });
   } catch (error: unknown) {
      const status = error instanceof QueryValidationError ? error.status : 500;
      return NextResponse.json(
         { message: error instanceof Error ? error.message : "Internal error" },
         { status },
      );
   }
}
