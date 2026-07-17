"use client";

import { Fragment, useState } from "react";
import { formatDateTimeCustom } from "@/lib/utils/format-date";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Download } from "lucide-react";
import type { Armada } from "@/lib/supabase/queries/verification.types";

const verifikasiColor: Record<string, string> = {
   menunggu: "bg-amber-50 text-accent border border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
   terverifikasi: "bg-emerald-50 text-brand-green dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
   ditolak: "bg-red-50 text-error border border-red-200/60 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
};

const operasionalColor: Record<string, string> = {
   aktif: "bg-emerald-50 text-brand-green dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
   tidak_aktif: "bg-base-200 text-base-content/70 border border-base-300",
   rusak: "bg-red-50 text-error border border-red-200/60 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
   cadangan: "bg-amber-50 text-accent border border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
   dijual: "bg-primary/10 text-primary bg-primary/10 border border-primary/25 dark:bg-blue-950/50 dark:border-blue-800",
};

const complianceColor: Record<string, string> = {
   compliant: "bg-emerald-50 text-brand-green dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
   non_compliant: "bg-red-50 text-error border border-red-200/60 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
   pending: "bg-amber-50 text-accent border border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
   unknown: "bg-base-200 text-base-content/70 border border-base-300",
};

const reconColor: Record<string, string> = {
   ready: "bg-emerald-50 text-brand-green dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
   needs_review: "bg-amber-50 text-accent border border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
   blocked: "bg-red-50 text-error border border-red-200/60 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
};

export interface IwkbuSyncData {
   armada_id: string;
   iwkbu_compliance_status: string;
   issue_count: number;
   source_updated_at: string | null;
   terminal_last_seen: string | null;
   reconciliation_status: string;
   discrepancy_note: string | null;
   last_synced_at: string | null;
   source_payload?: Record<string, unknown>;
}

interface RekonsiliasiArmadaTableProps {
   armada: Armada[];
   iwkbuMap: Record<string, IwkbuSyncData>;
}

function formatDate(dateStr: string | null): string {
   if (!dateStr) return "-";
   try {
      return formatDateTimeCustom(dateStr, {
         day: "2-digit",
         month: "short",
         year: "numeric",
         hour: "2-digit",
         minute: "2-digit",
      });
   } catch {
      return dateStr;
   }
}

export function RekonsiliasiArmadaTable({
   armada,
   iwkbuMap,
}: RekonsiliasiArmadaTableProps) {
   const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(15);

   const toggleExpand = (id: string) => {
      setExpandedId((prev) => (prev === id ? null : id));
   };

   const handleExportCSV = () => {
      const headers = ["No Polisi", "Merk/Tipe", "Status Operasional", "Verifikasi", "IWKBU", "Rekonsiliasi"];
      const rows = armada.map((a: Armada) => [
         a.nomor_polisi,
         `${a.merk ?? "-"} ${a.tipe ?? ""}`.trim(),
         a.status_operasional,
         a.status_verifikasi,
         iwkbuMap?.[a.id]?.iwkbu_compliance_status ?? "belum tersinkron",
         iwkbuMap?.[a.id]?.reconciliation_status ?? "-",
      ]);
      const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rekonsiliasi-armada.csv";
      a.click();
      URL.revokeObjectURL(url);
   };

   if (armada.length === 0) {
      return (
         <div className="rounded-lg border border-base-300 bg-base-100 overflow-hidden">
            <Table>
               <TableBody>
                  <TableRow>
                     <TableCell className="py-8 text-center text-sm text-base-content/70">
                        Belum ada armada terdaftar.
                     </TableCell>
                    </TableRow>
                 </TableBody>
           </Table>
       </div>
    );
}

   return (
      <>
      <div className="rounded-lg border border-base-300 bg-base-100 overflow-hidden">
         <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2 border-b border-base-300 bg-base-200/30 text-xs text-base-content/70">
            <span className="font-medium">Status Rekonsiliasi:</span>
            <span className="flex items-center gap-1.5">
               <Badge className={reconColor.ready}>ready</Badge>
               kepatuhan terverifikasi
            </span>
            <span className="flex items-center gap-1.5">
               <Badge className={reconColor.needs_review}>needs review</Badge>
               menunggu data IWKBU
            </span>
            <span className="flex items-center gap-1.5">
               <Badge className={reconColor.blocked}>blocked</Badge>
               tidak patuh
            </span>
            <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={handleExportCSV}>
               <Download className="size-3.5 mr-1" />
               CSV
            </Button>
         </div>
         <Table caption="Daftar rekonsiliasi armada PO">
            <TableHeader>
               <TableRow className="bg-base-200/50">
                  <TableHead className="w-8" />
                  <TableHead className="text-[13px]">No. Polisi</TableHead>
                  <TableHead className="text-[13px]">Merk/Tipe</TableHead>
                  <TableHead className="text-[13px]">
                     Status Operasional
                  </TableHead>
                  <TableHead className="text-[13px]">Verifikasi</TableHead>
                  <TableHead className="text-[13px]">IWKBU</TableHead>
                  <TableHead className="text-[13px]">Rekonsiliasi</TableHead>
                  <TableHead className="text-[13px]">Catatan</TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
               {armada.slice(0, visibleCount).map((a: Armada) => {
                  const sync = iwkbuMap[a.id];
                  const isExpanded = expandedId === a.id;
                  return (
                      <Fragment key={a.id}>
                         <TableRow>
                           <TableCell className="p-0">
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-8 w-8 p-0"
                                 onClick={() => toggleExpand(a.id)}
                              >
                                 {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                 ) : (
                                    <ChevronRight className="h-4 w-4" />
                                 )}
                              </Button>
                           </TableCell>
                           <TableCell className="font-medium">
                              {a.nomor_polisi}
                           </TableCell>
                           <TableCell>
                              {a.merk} {a.tipe}
                           </TableCell>
                           <TableCell>
                              <Badge
                                 className={
                                    operasionalColor[a.status_operasional] ?? ""
                                 }
                              >
                                 {a.status_operasional?.replace("_", " ")}
                              </Badge>
                           </TableCell>
                           <TableCell>
                              <Badge
                                 className={
                                    verifikasiColor[a.status_verifikasi] ?? ""
                                 }
                              >
                                 {a.status_verifikasi}
                              </Badge>
                           </TableCell>
                           <TableCell>
                              {sync ? (
                                 <Badge
                                    className={
                                       complianceColor[
                                          sync.iwkbu_compliance_status
                                       ] ?? ""
                                    }
                                 >
                                    {sync.iwkbu_compliance_status?.replace(
                                       "_",
                                       " ",
                                    )}
                                 </Badge>
                              ) : (
                                 <span className="text-xs text-base-content/70">
                                    Belum tersinkron
                                 </span>
                              )}
                           </TableCell>
                           <TableCell>
                              {sync ? (
                                 <Badge
                                    className={
                                       reconColor[sync.reconciliation_status] ??
                                       ""
                                    }
                                 >
                                    {sync.reconciliation_status?.replace(
                                       "_",
                                       " ",
                                    )}
                                 </Badge>
                              ) : (
                                 <span className="text-xs text-base-content/70">
                                    -
                                 </span>
                              )}
                           </TableCell>
                           <TableCell className="max-w-[200px] text-xs text-base-content/70">
                              {a.status_verifikasi === "ditolak" &&
                              a.keterangan_verifikasi
                                 ? `Ditolak: ${a.keterangan_verifikasi}`
                                 : (sync?.discrepancy_note ?? "-")}
                           </TableCell>
                        </TableRow>
                        {isExpanded && (
                           <TableRow
                              key={`${a.id}-detail`}
                              className="bg-base-200/40"
                           >
                              <TableCell colSpan={8} className="p-4">
                                 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                       <p className="text-[11px] font-medium text-base-content/70 uppercase tracking-wide">
                                          Jumlah Issue IWKBU
                                       </p>
                                       <p className="text-sm font-semibold mt-0.5">
                                          {sync?.issue_count ?? 0}
                                       </p>
                                    </div>
                                    <div>
                                       <p className="text-[11px] font-medium text-base-content/70 uppercase tracking-wide">
                                          Sumber Diperbarui
                                       </p>
                                       <p className="text-sm mt-0.5">
                                          {formatDate(
                                             sync?.source_updated_at ?? null,
                                          )}
                                       </p>
                                    </div>
                                    <div>
                                       <p className="text-[11px] font-medium text-base-content/70 uppercase tracking-wide">
                                          Terakhir Terlihat di Terminal
                                       </p>
                                       <p className="text-sm mt-0.5">
                                          {formatDate(
                                             sync?.terminal_last_seen ?? null,
                                          )}
                                       </p>
                                    </div>
                                    <div>
                                       <p className="text-[11px] font-medium text-base-content/70 uppercase tracking-wide">
                                          Sinkronisasi Terakhir
                                       </p>
                                       <p className="text-sm mt-0.5">
                                          {formatDate(
                                             sync?.last_synced_at ?? null,
                                          )}
                                       </p>
                                    </div>
                                 </div>
                                 {sync?.discrepancy_note && (
                                    <div className="mt-3 rounded-md border border-amber-200/60 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/50 px-3 py-2">
                                       <p className="text-[11px] font-medium text-accent uppercase tracking-wide">
                                          Catatan Diskrepansi
                                       </p>
                                       <p className="text-sm text-accent-foreground mt-0.5">
                                          {sync.discrepancy_note}
                                       </p>
                                    </div>
                                 )}
                                 {a.keterangan_verifikasi && (
                                    <div className="mt-2">
                                       <p className="text-[11px] font-medium text-base-content/70 uppercase tracking-wide">
                                          Keterangan Verifikasi
                                       </p>
                                       <p className="text-sm mt-0.5">
                                          {a.keterangan_verifikasi}
                                       </p>
                                    </div>
                                 )}
                              </TableCell>
                           </TableRow>
                        )}
                      </Fragment>
                  );
               })}
            </TableBody>
         </Table>
      </div>

      {visibleCount < armada.length && (
         <div className="flex justify-center pt-3">
            <Button
               variant="outline"
               size="sm"
               onClick={() => setVisibleCount((c) => c + 15)}
            >
               Tampilkan Lebih Banyak ({armada.length - visibleCount} lagi)
            </Button>
         </div>
      )}
      </>
   );
}
