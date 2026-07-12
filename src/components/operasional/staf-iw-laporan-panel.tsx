"use client";

import { useState } from "react";
import { formatDateShort } from "@/lib/utils/format-date";
import {
   Card,
   CardContent,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Download, FileSpreadsheet, ShieldCheck, ClipboardList, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { exportXlsx } from "@/lib/export/xlsx.client";
import type { FindingRecord, FindingStatus } from "@/lib/supabase/queries/operasional.types";

export interface StafIwLaporanStats {
   poAktif: number;
   poMenunggu: number;
   armadaTerverifikasi: number;
   armadaMenunggu: number;
   armadaDitolak: number;
}

const STATUS_LABEL: Record<FindingStatus, string> = {
   open: "Terbuka",
   on_progress: "Diproses",
   closed: "Selesai",
};
const STATUS_BADGE: Record<FindingStatus, string> = {
   open: "badge-warning",
   on_progress: "badge-info",
   closed: "badge-success",
};

export function StafIwLaporanPanel({
   findings,
   stats,
}: {
   findings: FindingRecord[];
   stats: StafIwLaporanStats;
}) {
   const [exporting, setExporting] = useState(false);

   const open = findings.filter((f) => f.status === "open").length;
   const onProgress = findings.filter((f) => f.status === "on_progress").length;
   const closed = findings.filter((f) => f.status === "closed").length;
   const belumVerifikasi = stats.armadaMenunggu + stats.armadaDitolak;

   async function handleExportFindings() {
      if (findings.length === 0) {
         toast.error("Tidak ada data temuan untuk diekspor");
         return;
      }
      setExporting(true);
      try {
         const header = [
            "Kode PO",
            "Nama PO",
            "Nomor Polisi",
            "Judul",
            "Severity",
            "Status",
            "Sumber",
            "Dibuat",
            "Selesai",
         ];
         const rows = findings.map((f) => [
            f.po?.kode_po ?? "-",
            f.po?.nama_perusahaan ?? "-",
            f.nomor_polisi,
            f.judul,
            f.severity,
            STATUS_LABEL[f.status],
            f.source_type,
            formatDateShort(f.created_at),
            formatDateShort(f.resolved_at),
         ]);
         await exportXlsx(`laporan-temuan-staf-iw-${new Date().toISOString().slice(0, 10)}.xlsx`, [
            { name: "Temuan", rows: [header, ...rows] },
         ]);
         toast.success("Laporan temuan diekspor (XLSX)");
      } catch {
         toast.error("Gagal mengekspor laporan");
      } finally {
         setExporting(false);
      }
   }

   function handleExportCsv() {
      if (findings.length === 0) {
         toast.error("Tidak ada data temuan untuk diekspor");
         return;
      }
      const header = [
         "Kode PO",
         "Nama PO",
         "Nomor Polisi",
         "Judul",
         "Severity",
         "Status",
         "Sumber",
         "Dibuat",
         "Selesai",
      ];
      const escape = (v: unknown) => {
         const s = String(v ?? "");
         return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
      };
      const rows = findings
         .map((f) =>
            [
               f.po?.kode_po ?? "-",
               f.po?.nama_perusahaan ?? "-",
               f.nomor_polisi,
               f.judul,
               f.severity,
               STATUS_LABEL[f.status],
               f.source_type,
               formatDateShort(f.created_at),
               formatDateShort(f.resolved_at),
            ]
               .map(escape)
               .join(","),
         )
         .join("\n");
      const blob = new Blob([`${header.join(",")}\n${rows}`], {
         type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-temuan-staf-iw-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Laporan temuan diekspor (CSV)");
   }

   return (
      <div className="space-y-6">
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
               title="PO Aktif"
               value={String(stats.poAktif)}
               description={`${stats.poMenunggu} menunggu verifikasi`}
               icon="users"
               accent="blue"
            />
            <DashboardCard
               title="Armada Terverifikasi"
               value={String(stats.armadaTerverifikasi)}
               description={`${belumVerifikasi} menunggu/ditolak`}
               icon="shield-check"
               accent="green"
            />
            <DashboardCard
               title="Temuan Terbuka"
               value={String(open + onProgress)}
               description={`${open} terbuka · ${onProgress} diproses`}
               icon="alert-triangle"
               accent="amber"
            />
            <DashboardCard
               title="Temuan Selesai"
               value={String(closed)}
               description="Telah ditindak lanjuti"
               icon="check-circle"
               accent="green"
            />
         </div>

         <Card>
            <CardHeader className="pb-4">
               <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
                  <span className="flex items-center gap-2">
                     <FileSpreadsheet className="size-4 text-primary" aria-hidden="true" />
                     Laporan Temuan & Ekspor
                  </span>
                   <div className="flex gap-2">
                      <Button
                         variant="outline"
                         size="sm"
                         onClick={handleExportFindings}
                         disabled={exporting || findings.length === 0}
                      >
                         <Download className="size-4" aria-hidden="true" />
                         XLSX
                      </Button>
                      <Button
                         variant="outline"
                         size="sm"
                         onClick={handleExportCsv}
                         disabled={findings.length === 0}
                      >
                         <Download className="size-4" aria-hidden="true" />
                         CSV
                      </Button>
                   </div>
               </CardTitle>
            </CardHeader>
            <CardContent>
               {findings.length === 0 ? (
                  <EmptyState
                     title="Belum ada temuan tercatat"
                     icon={ClipboardList}
                     className="border-0 py-6"
                  />
               ) : (
                  <Table caption="Daftar temuan rekonsiliasi kepatuhan">
                     <TableHeader>
                        <TableRow>
                           <TableHead>PO</TableHead>
                           <TableHead>Nomor Polisi</TableHead>
                           <TableHead>Judul</TableHead>
                           <TableHead>Severity</TableHead>
                           <TableHead>Status</TableHead>
                           <TableHead>Dibuat</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {findings.slice(0, 100).map((f) => (
                           <TableRow key={f.id}>
                              <TableCell className="font-medium">
                                 {f.po?.kode_po ?? "-"}
                                 <span className="block text-xs font-normal text-base-content/50">
                                    {f.po?.nama_perusahaan ?? "-"}
                                 </span>
                              </TableCell>
                              <TableCell>{f.nomor_polisi}</TableCell>
                              <TableCell className="max-w-[260px] truncate">
                                 {f.judul}
                              </TableCell>
                              <TableCell>
                                 <Badge
                                    className={
                                       f.severity === "high"
                                          ? "badge-error"
                                          : f.severity === "medium"
                                            ? "badge-warning"
                                            : "badge-ghost"
                                    }
                                 >
                                    {f.severity}
                                 </Badge>
                              </TableCell>
                              <TableCell>
                                 <Badge className={STATUS_BADGE[f.status]}>
                                    {STATUS_LABEL[f.status]}
                                 </Badge>
                              </TableCell>
                              <TableCell className="text-base-content/60">
                                 {formatDateShort(f.created_at)}
                              </TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               )}
            </CardContent>
         </Card>
      </div>
   );
}
