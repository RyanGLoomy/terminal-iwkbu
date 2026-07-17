import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import { createNotificationForRole } from "@/lib/supabase/queries/notifications.server";

const MAX_ROWS = 500;

const ALLOWED_OPERASIONAL = new Set([
   "aktif",
   "tidak_aktif",
   "rusak",
   "cadangan",
   "dijual",
]);

function parseCsv(text: string): Record<string, string>[] {
   const lines = text
      .replace(/\r\n/g, "\n")
      .split("\n")
      .filter((l) => l.trim().length > 0);
   if (lines.length < 2) return [];

   const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
         const ch = line[i];
         if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
               current += '"';
               i++;
            } else {
               inQuotes = !inQuotes;
            }
         } else if (ch === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
         } else {
            current += ch;
         }
      }
      result.push(current.trim());
      return result;
   };

   const headers = parseLine(lines[0]).map((h) =>
      h.toLowerCase().replace(/\s+/g, "_"),
   );
   const rows: Record<string, string>[] = [];
   for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
         row[h] = values[idx] ?? "";
      });
      rows.push(row);
   }
   return rows;
}

export async function POST(request: NextRequest) {
   try {
      const actor = await requireActor(ROLES.PO);

      const admin = createAdminClient();

      const { data: po } = await admin
         .from("po")
         .select("status_verifikasi")
         .eq("id", actor.user.id)
         .single();

      if (!po || po.status_verifikasi !== "aktif") {
         return NextResponse.json(
            { message: "PO belum terverifikasi atau tidak aktif" },
            { status: 403 },
         );
      }

      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
         return NextResponse.json(
            { message: "File CSV wajib diunggah." },
            { status: 400 },
         );
      }

      if (file.size > 2 * 1024 * 1024) {
         return NextResponse.json(
            { message: "Ukuran file maksimal 2 MB." },
            { status: 400 },
         );
      }

      const fileName = (file.name ?? "").toLowerCase();
      let rows: Record<string, string>[];

      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
         // xlsx ships without bundled TS types — project convention: dynamic
         // import only. @ts-ignore suppresses the module-resolution error.
         // eslint-disable-next-line @typescript-eslint/ban-ts-comment
         // @ts-ignore
         const XLSX = await import("xlsx");
         const buffer = Buffer.from(await file.arrayBuffer());
         const workbook = XLSX.read(buffer, { type: "array" });
         const sheet = workbook.Sheets[workbook.SheetNames[0]];
         if (!sheet) {
            return NextResponse.json(
               { message: "File Excel tidak memiliki sheet." },
               { status: 400 },
            );
         }
         rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      } else {
         const text = await file.text();
         rows = parseCsv(text);
      }

      if (rows.length === 0) {
         return NextResponse.json(
            { message: "File CSV kosong atau tidak memiliki data (header wajib)." },
            { status: 400 },
         );
      }

      if (rows.length > MAX_ROWS) {
         return NextResponse.json(
            { message: `Maksimal ${MAX_ROWS} baris per import (diterima: ${rows.length}).` },
            { status: 400 },
         );
      }

      const errors: { row: number; message: string }[] = [];
      const insertRows: Record<string, unknown>[] = [];

      rows.forEach((row, idx) => {
         const rowNum = idx + 2;
         const nomor_polisi = (row.nomor_polisi ?? "").trim();
         if (!nomor_polisi) {
            errors.push({ row: rowNum, message: "nomor_polisi wajib diisi" });
            return;
         }

         const readNum = (key: string): number | null => {
            const v = row[key];
            if (!v || v.trim() === "") return null;
            const n = Number(v);
            if (!Number.isInteger(n) || n < 0) {
               errors.push({ row: rowNum, message: `${key} harus angka positif` });
               return Number.NaN;
            }
            return n;
         };

         const status_ops = (row.status_operasional ?? "aktif").trim();
         if (!ALLOWED_OPERASIONAL.has(status_ops)) {
            errors.push({
               row: rowNum,
               message: `status_operasional tidak valid: ${status_ops}`,
            });
            return;
         }

         const tahun = readNum("tahun_pembuatan");
         const kapasitas = readNum("kapasitas_penumpang");
         if (tahun === Number.NaN || kapasitas === Number.NaN) return;

         insertRows.push({
            po_id: actor.user.id,
            nomor_polisi,
            nomor_lambung: (row.nomor_lambung ?? "").trim() || null,
            merk: (row.merk ?? "").trim() || null,
            tipe: (row.tipe ?? "").trim() || null,
            tahun_pembuatan: tahun,
            nomor_chassis: (row.nomor_chassis ?? "").trim() || null,
            nomor_mesin: (row.nomor_mesin ?? "").trim() || null,
            kapasitas_penumpang: kapasitas,
            status_operasional: status_ops,
            status_verifikasi: "menunggu",
         });
      });

      let successCount = 0;
      if (insertRows.length > 0) {
          const { error } = await admin.from("armada").insert(insertRows);
          if (error) {
             return NextResponse.json(
                { message: "Gagal import data armada. Periksa format dan duplikasi.", errors },
                { status: 400 },
            );
         }
         successCount = insertRows.length;
      }

      await logActivity(
         "BUAT_ARMADA",
         `Import CSV armada: ${successCount} berhasil${errors.length > 0 ? `, ${errors.length} gagal` : ""}`,
         { imported: successCount, errors: errors.length },
         { actorUserId: actor.user.id },
      );

      if (successCount > 0) {
         await createNotificationForRole(ROLES.STAF_IW, {
            title: "Import Armada Baru",
            message: `${successCount} armada baru diimport oleh PO, menunggu verifikasi.`,
            type: "info",
            link: "/staf-iw",
         });
      }

      return NextResponse.json(
         { success: successCount, errors, total: rows.length },
         { status: 201 },
      );
   } catch (error) {
      return actorErrorHandler(error);
   }
}
