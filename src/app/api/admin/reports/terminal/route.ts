import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { getAdminRekapHarian } from "@/lib/supabase/queries/operasional.server";
import type {
   AdminRekapRow,
   TerminalReport,
   TerminalReportArmadaRow,
   TerminalReportPeriodRow,
   TerminalReportPetugasRow,
   TerminalReportPoRow,
} from "@/lib/supabase/queries/operasional.types";

const ALLOWED_ROLES = ["admin-terminal", "staf-iw"] as const;
const MAX_RANGE_DAYS = 62;

type AllowedRole = (typeof ALLOWED_ROLES)[number];

function isAllowedRole(role: string | null | undefined): role is AllowedRole {
   return ALLOWED_ROLES.includes(role as AllowedRole);
}

function parseDateParam(value: string | null) {
   if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

   const date = new Date(`${value}T00:00:00.000Z`);
   if (Number.isNaN(date.getTime())) return null;
   if (date.toISOString().slice(0, 10) !== value) return null;

   return date;
}

function getDateRange(startDate: string, endDate: string) {
   const dates: string[] = [];
   const cursor = new Date(`${startDate}T00:00:00.000Z`);
   const end = new Date(`${endDate}T00:00:00.000Z`);

   while (cursor <= end) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
   }

   return dates;
}

function getArmadaLabel(row: AdminRekapRow) {
   return (
      [row.armada_merk, row.armada_tipe].filter(Boolean).join(" ") ||
      row.armada_lambung ||
      row.nomor_polisi
   );
}

function addPeriodCount(
   map: Map<string, TerminalReportPeriodRow>,
   key: string,
   label: string,
   row: AdminRekapRow,
) {
   const current = map.get(key) ?? {
      period_key: key,
      label,
      total_masuk: 0,
      total_keluar: 0,
      di_terminal: 0,
   };

   current.total_masuk += 1;
   if (row.waktu_keluar) current.total_keluar += 1;
   current.di_terminal = current.total_masuk - current.total_keluar;
   map.set(key, current);
}

function formatDateLabel(dateKey: string) {
   return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
   }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

function getWeekStartKey(dateKey: string) {
   const date = new Date(`${dateKey}T00:00:00.000Z`);
   const day = date.getUTCDay();
   const diff = day === 0 ? -6 : 1 - day;
   date.setUTCDate(date.getUTCDate() + diff);
   return date.toISOString().slice(0, 10);
}

function sortByMasukDesc<T extends { total_masuk: number }>(rows: T[]) {
   return rows.sort((a, b) => b.total_masuk - a.total_masuk);
}

function buildReport(
   terminalId: string,
   startDate: string,
   endDate: string,
   rows: AdminRekapRow[],
): TerminalReport {
   const poMap = new Map<string, TerminalReportPoRow>();
   const petugasMap = new Map<string, TerminalReportPetugasRow>();
   const armadaMap = new Map<string, TerminalReportArmadaRow>();
   const dayMap = new Map<string, TerminalReportPeriodRow>();
   const weekMap = new Map<string, TerminalReportPeriodRow>();
   const monthMap = new Map<string, TerminalReportPeriodRow>();

   for (const row of rows) {
      const poKey = row.po_kode || "-";
      const po = poMap.get(poKey) ?? {
         po_kode: row.po_kode || "-",
         po_nama: row.po_nama || "-",
         total_masuk: 0,
         total_keluar: 0,
         di_terminal: 0,
      };
      po.total_masuk += 1;
      if (row.waktu_keluar) po.total_keluar += 1;
      po.di_terminal = po.total_masuk - po.total_keluar;
      poMap.set(poKey, po);

      const petugasKey = row.petugas_nama || "Tanpa nama petugas";
      const petugas = petugasMap.get(petugasKey) ?? {
         petugas_nama: petugasKey,
         total_masuk: 0,
         total_keluar: 0,
         di_terminal: 0,
      };
      petugas.total_masuk += 1;
      if (row.waktu_keluar) petugas.total_keluar += 1;
      petugas.di_terminal = petugas.total_masuk - petugas.total_keluar;
      petugasMap.set(petugasKey, petugas);

      const armadaKey = row.nomor_polisi;
      const armada = armadaMap.get(armadaKey) ?? {
         nomor_polisi: row.nomor_polisi,
         po_kode: row.po_kode || "-",
         po_nama: row.po_nama || "-",
         armada_label: getArmadaLabel(row),
         total_masuk: 0,
         total_keluar: 0,
         di_terminal: 0,
      };
      armada.total_masuk += 1;
      if (row.waktu_keluar) armada.total_keluar += 1;
      armada.di_terminal = armada.total_masuk - armada.total_keluar;
      armadaMap.set(armadaKey, armada);

      const dayKey = row.waktu_masuk.slice(0, 10);
      const weekKey = getWeekStartKey(dayKey);
      const monthKey = dayKey.slice(0, 7);

      addPeriodCount(dayMap, dayKey, formatDateLabel(dayKey), row);
      addPeriodCount(
         weekMap,
         weekKey,
         `Minggu ${formatDateLabel(weekKey)}`,
         row,
      );
      addPeriodCount(
         monthMap,
         monthKey,
         new Intl.DateTimeFormat("id-ID", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
         }).format(new Date(`${monthKey}-01T00:00:00.000Z`)),
         row,
      );
   }

   const sortedRows = [...rows].sort(
      (a, b) =>
         new Date(b.waktu_masuk).getTime() - new Date(a.waktu_masuk).getTime(),
   );
   const totalKeluar = sortedRows.filter((row) => row.waktu_keluar).length;

   return {
      terminal_id: terminalId,
      start_date: startDate,
      end_date: endDate,
      rows: sortedRows,
      summary: {
         total_masuk: sortedRows.length,
         total_keluar: totalKeluar,
         masih_di_terminal: sortedRows.length - totalKeluar,
         jumlah_po: poMap.size,
         jumlah_petugas: petugasMap.size,
         jumlah_armada: armadaMap.size,
      },
      per_po: sortByMasukDesc([...poMap.values()]),
      per_petugas: sortByMasukDesc([...petugasMap.values()]),
      per_armada: sortByMasukDesc([...armadaMap.values()]),
      per_hari: [...dayMap.values()].sort((a, b) =>
         a.period_key.localeCompare(b.period_key),
      ),
      per_minggu: [...weekMap.values()].sort((a, b) =>
         a.period_key.localeCompare(b.period_key),
      ),
      per_bulan: [...monthMap.values()].sort((a, b) =>
         a.period_key.localeCompare(b.period_key),
      ),
   };
}

export async function GET(request: NextRequest) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      if (!isAllowedRole(actor.role)) {
         return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }

      const searchParams = request.nextUrl.searchParams;
      const requestedTerminalId = searchParams.get("terminalId")?.trim() ?? "";
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const parsedStart = parseDateParam(startDate);
      const parsedEnd = parseDateParam(endDate);

      if (!parsedStart || !parsedEnd || !startDate || !endDate) {
         return NextResponse.json(
            { message: "Tanggal laporan wajib berformat YYYY-MM-DD" },
            { status: 400 },
         );
      }

      if (parsedStart > parsedEnd) {
         return NextResponse.json(
            { message: "Tanggal awal tidak boleh melebihi tanggal akhir" },
            { status: 400 },
         );
      }

      const dates = getDateRange(startDate, endDate);
      if (dates.length > MAX_RANGE_DAYS) {
         return NextResponse.json(
            { message: `Rentang laporan maksimal ${MAX_RANGE_DAYS} hari` },
            { status: 400 },
         );
      }

      if (
         actor.role === "admin-terminal" &&
         requestedTerminalId &&
         requestedTerminalId !== actor.terminalId
      ) {
         return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }

      const effectiveTerminalId =
         actor.role === "admin-terminal" ? actor.terminalId : requestedTerminalId;

      if (!effectiveTerminalId) {
         return NextResponse.json(
            { message: "Terminal laporan wajib dipilih" },
            { status: 400 },
         );
      }

      const results = await Promise.all(
         dates.map((date) => getAdminRekapHarian(effectiveTerminalId, date)),
      );
      const rows = results.flat();

      return NextResponse.json({
         data: buildReport(effectiveTerminalId, startDate, endDate, rows),
      });
   } catch (error: unknown) {
      return NextResponse.json(
         { message: error instanceof Error ? error.message : "Internal error" },
         { status: 500 },
      );
   }
}
