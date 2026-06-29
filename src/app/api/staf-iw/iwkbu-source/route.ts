import { NextRequest, NextResponse } from "next/server";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeDbError } from "@/lib/db-error";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import { normalizePlate } from "@/lib/rekonsiliasi/engine";

const MAX_IMPORT_ROWS = 5000;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + 64 * 1024;
const ALLOWED_COMPLIANCE = [
   "compliant",
   "non_compliant",
   "pending",
   "unknown",
] as const;

type ComplianceStatus = (typeof ALLOWED_COMPLIANCE)[number];
type RawImportRow = Record<string, unknown>;

class ImportValidationError extends Error {
   status = 400;
   constructor(message: string) {
      super(message);
      this.name = "ImportValidationError";
   }
}

function normalizeKey(value: string) {
   return value
      .trim()
      .toLowerCase()
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
}

function getField(row: RawImportRow, names: string[]) {
   const normalizedNames = new Set(names.map(normalizeKey));

   for (const [key, value] of Object.entries(row)) {
      if (normalizedNames.has(normalizeKey(key))) return value;
   }

   return undefined;
}

function asString(value: unknown) {
   if (value === null || value === undefined) return "";
   return String(value).trim();
}

function normalizeComplianceStatus(value: unknown): ComplianceStatus {
   const normalized = normalizeKey(asString(value) || "unknown");
   const aliases: Record<string, ComplianceStatus> = {
      compliant: "compliant",
      comply: "compliant",
      patuh: "compliant",
      sesuai: "compliant",
      non_compliant: "non_compliant",
      noncompliant: "non_compliant",
      tidak_patuh: "non_compliant",
      tidak_sesuai: "non_compliant",
      bermasalah: "non_compliant",
      pending: "pending",
      menunggu: "pending",
      proses: "pending",
      unknown: "unknown",
      tidak_diketahui: "unknown",
      kosong: "unknown",
   };

   return aliases[normalized] ?? "unknown";
}

function normalizeIssueCount(value: unknown, rowNumber: number) {
   if (value === null || value === undefined || value === "") return 0;

   const parsed = Number(value);
   if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
      throw new ImportValidationError(
         `Baris ${rowNumber}: issue_count harus bilangan bulat non-negatif`,
      );
   }

   return parsed;
}

function normalizeSourceDate(value: unknown, rowNumber: number) {
   if (value === null || value === undefined || value === "") return null;

   if (typeof value === "number") {
      const excelEpoch = Date.UTC(1899, 11, 30);
      const date = new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
   }

   const raw = String(value).trim();
   const dmyMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
   if (dmyMatch) {
      const day = Number(dmyMatch[1]);
      const month = Number(dmyMatch[2]);
      const year = Number(dmyMatch[3]);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (
         date.getUTCFullYear() === year &&
         date.getUTCMonth() === month - 1 &&
         date.getUTCDate() === day
      ) {
         return date.toISOString();
      }

      throw new ImportValidationError(
         `Baris ${rowNumber}: source_updated_at tidak valid`,
      );
   }

   const ymdMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
   if (!ymdMatch) {
      throw new ImportValidationError(
         `Baris ${rowNumber}: source_updated_at harus ISO atau DD/MM/YYYY`,
      );
   }

   const year = Number(ymdMatch[1]);
   const month = Number(ymdMatch[2]);
   const day = Number(ymdMatch[3]);
   const calendarDate = new Date(Date.UTC(year, month - 1, day));
   if (
      calendarDate.getUTCFullYear() !== year ||
      calendarDate.getUTCMonth() !== month - 1 ||
      calendarDate.getUTCDate() !== day
   ) {
      throw new ImportValidationError(
         `Baris ${rowNumber}: source_updated_at tidak valid`,
      );
   }

   const date = new Date(raw);
   if (Number.isNaN(date.getTime())) {
      throw new ImportValidationError(
         `Baris ${rowNumber}: source_updated_at tidak valid`,
      );
   }

   return date.toISOString();
}

function safePayload(row: RawImportRow) {
   return Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
         if (
            value === null ||
            value === undefined ||
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
         ) {
            return [key, value ?? null];
         }

         return [key, String(value)];
      }),
   );
}

function normalizeRows(records: RawImportRow[]) {
   if (records.length === 0) {
      throw new ImportValidationError(
         "records wajib berupa array dan tidak boleh kosong",
      );
   }

   if (records.length > MAX_IMPORT_ROWS) {
      throw new ImportValidationError(
         `Jumlah record melebihi batas ${MAX_IMPORT_ROWS} baris`,
      );
   }

   const seenExternalRefs = new Set<string>();

   return records.map((item, index) => {
      const rowNumber = index + 1;

      if (!item || typeof item !== "object" || Array.isArray(item)) {
         throw new ImportValidationError(
            `Baris ${rowNumber}: record harus berupa object`,
         );
      }

      const nomorPolisi = asString(
         getField(item, ["nomor_polisi", "nomorPolisi", "nomor polisi", "nopol"]),
      );

      if (!nomorPolisi) {
         throw new ImportValidationError(
            `Baris ${rowNumber}: nomor_polisi wajib diisi`,
         );
      }

      const normalizedPlate = normalizePlate(nomorPolisi);
      const externalRef =
         asString(getField(item, ["external_ref", "externalRef", "referensi"])) ||
         `plate:${normalizedPlate}`;

      if (seenExternalRefs.has(externalRef)) {
         throw new ImportValidationError(
            `Baris ${rowNumber}: external_ref duplikat dalam file (${externalRef})`,
         );
      }
      seenExternalRefs.add(externalRef);

      return {
         external_ref: externalRef,
         nomor_polisi: normalizedPlate,
         compliance_status: normalizeComplianceStatus(
            getField(item, [
               "compliance_status",
               "complianceStatus",
               "status_iwkbu",
               "status kepatuhan",
               "status",
            ]),
         ),
         issue_count: normalizeIssueCount(
            getField(item, ["issue_count", "issueCount", "jumlah_temuan"]),
            rowNumber,
         ),
         source_updated_at: normalizeSourceDate(
            getField(item, [
               "source_updated_at",
               "sourceUpdatedAt",
               "tanggal_update",
               "updated_at",
            ]),
            rowNumber,
         ),
         payload: safePayload(item),
         imported_at: new Date().toISOString(),
      };
   });
}

function detectCsvDelimiter(text: string) {
   const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
   const commaCount = (firstLine.match(/,/g) ?? []).length;
   const semicolonCount = (firstLine.match(/;/g) ?? []).length;
   return semicolonCount > commaCount ? ";" : ",";
}

function parseCsv(text: string): RawImportRow[] {
   const table: string[][] = [];
   let row: string[] = [];
   let cell = "";
   let inQuotes = false;
   const delimiter = detectCsvDelimiter(text);

   for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];

      if (char === '"') {
         if (inQuotes && next === '"') {
            cell += '"';
            index += 1;
         } else {
            inQuotes = !inQuotes;
         }
      } else if (char === delimiter && !inQuotes) {
         row.push(cell);
         cell = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
         if (char === "\r" && next === "\n") index += 1;
         row.push(cell);
         if (row.some((value) => value.trim() !== "")) table.push(row);
         row = [];
         cell = "";
      } else {
         cell += char;
      }
   }

   row.push(cell);
   if (row.some((value) => value.trim() !== "")) table.push(row);

   const headers = table[0]?.map((header) => header.trim()) ?? [];
   if (headers.length === 0) return [];

   return table.slice(1).map((values) => {
      const item: RawImportRow = {};
      headers.forEach((header, index) => {
         item[header] = values[index]?.trim() ?? "";
      });
      return item;
   });
}

async function parseUploadFile(file: File): Promise<RawImportRow[]> {
   const fileName = file.name.toLowerCase();

   if (file.size <= 0) {
      throw new ImportValidationError("File upload kosong");
   }

   if (file.size > MAX_UPLOAD_BYTES) {
      throw new ImportValidationError("Ukuran file maksimal 2 MB");
   }

   if (fileName.endsWith(".csv")) {
      return parseCsv(await file.text());
   }

   if (fileName.endsWith(".json")) {
      let parsed: unknown;
      try {
         parsed = JSON.parse(await file.text()) as unknown;
      } catch {
         throw new ImportValidationError("JSON tidak valid");
      }

      if (Array.isArray(parsed)) return parsed as RawImportRow[];
      if (
         parsed &&
         typeof parsed === "object" &&
         Array.isArray((parsed as { records?: unknown }).records)
      ) {
         return (parsed as { records: RawImportRow[] }).records;
      }
      throw new ImportValidationError(
         "JSON harus berupa array atau object dengan properti records",
      );
   }

   throw new ImportValidationError("Format file harus CSV atau JSON");
}

async function getRecordsFromRequest(request: NextRequest) {
   const contentType = request.headers.get("content-type") ?? "";

   if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
         throw new ImportValidationError("File wajib diunggah pada field file");
      }

      return parseUploadFile(file);
   }

   const rawBody = await request.text();
   if (new TextEncoder().encode(rawBody).length > MAX_UPLOAD_BYTES) {
      throw new ImportValidationError("Ukuran payload JSON maksimal 2 MB");
   }

   let body: unknown = null;
   try {
      body = rawBody ? (JSON.parse(rawBody) as unknown) : null;
   } catch {
      throw new ImportValidationError("JSON tidak valid");
   }
   if (Array.isArray(body)) return body as RawImportRow[];
   if (
      body &&
      typeof body === "object" &&
      Array.isArray((body as { records?: unknown }).records)
   ) {
      return (body as { records: RawImportRow[] }).records;
   }

   return [];
}

function enforceRequestSize(request: NextRequest) {
   const contentLength = request.headers.get("content-length");
   if (!contentLength) {
      throw new ImportValidationError(
         "Header Content-Length wajib dikirim untuk upload source IWKBU",
      );
   }

   const parsedLength = Number(contentLength);
   if (!Number.isFinite(parsedLength) || parsedLength > MAX_REQUEST_BYTES) {
      throw new ImportValidationError("Ukuran request upload maksimal 2 MB");
   }
}

export async function GET() {
   try {
      await requireActor(ROLES.STAF_IW);

      const admin = createAdminClient();
      const { data, error: queryError } = await admin
         .from("iwkbu_source_records")
         .select(
            "id, external_ref, nomor_polisi, compliance_status, issue_count, source_updated_at, imported_at",
         )
         .order("imported_at", { ascending: false })
         .limit(500);

      if (queryError) {
         return NextResponse.json({ message: sanitizeDbError(queryError, "iwkbu-source list") }, { status: 500 });
      }

      return NextResponse.json({ data: data ?? [] });
   } catch (error) {
      return actorErrorHandler(error);
   }
}

export async function POST(request: NextRequest) {
   try {
      await requireActor(ROLES.STAF_IW);

      enforceRequestSize(request);

      const records = await getRecordsFromRequest(request);
      const normalized = normalizeRows(records);

      const admin = createAdminClient();
      const { error: upsertError } = await admin
         .from("iwkbu_source_records")
         .upsert(normalized, { onConflict: "external_ref" });

      if (upsertError) {
         return NextResponse.json({ message: sanitizeDbError(upsertError, "iwkbu-source import") }, { status: 500 });
      }

      await logActivity(
         "IMPORT_IWKBU",
         `Import ${normalized.length} source records IWKBU`,
         { count: normalized.length },
      );

      return NextResponse.json(
         {
            message: "Source records berhasil di-upsert",
            count: normalized.length,
         },
         { status: 201 },
      );
   } catch (error) {
      if (error instanceof ImportValidationError) {
         return NextResponse.json(
            { message: error.message },
            { status: 400 },
         );
      }
      return actorErrorHandler(error);
   }
}
