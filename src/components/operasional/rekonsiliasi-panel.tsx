"use client";

import { useMemo, memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import type { Armada, PO } from "@/lib/supabase/queries/verification.types";
import { Download } from "lucide-react";

type ReconciliationRow = {
   po: PO;
   totalArmada: number;
   armadaTerverifikasi: number;
   armadaMenunggu: number;
   status: "siap" | "perlu perhatian" | "belum ada armada";
};

function buildRows(pos: PO[], armada: Armada[]): ReconciliationRow[] {
   // Build Map for O(1) lookups instead of O(n) filter
   const armadaByPoId = new Map<string, Armada[]>();

   for (const item of armada) {
      if (!armadaByPoId.has(item.po_id)) {
         armadaByPoId.set(item.po_id, []);
      }
      armadaByPoId.get(item.po_id)!.push(item);
   }

   // Pre-count statuses for each PO
   const counts = new Map<string, { verified: number; pending: number }>();

   for (const [poId, armadaList] of armadaByPoId) {
      let verified = 0;
      let pending = 0;

      for (const item of armadaList) {
         if (item.status_verifikasi === "terverifikasi") {
            verified++;
         } else if (item.status_verifikasi === "menunggu") {
            pending++;
         }
      }

      counts.set(poId, { verified, pending });
   }

   return pos.map((po) => {
      const armadaPO = armadaByPoId.get(po.id) || [];
      const { verified: armadaTerverifikasi, pending: armadaMenunggu } =
         counts.get(po.id) || { verified: 0, pending: 0 };

      let status: ReconciliationRow["status"] = "perlu perhatian";
      if (armadaPO.length === 0) {
         status = "belum ada armada";
      } else if (armadaMenunggu === 0) {
         status = "siap";
      }

      return {
         po,
         totalArmada: armadaPO.length,
         armadaTerverifikasi,
         armadaMenunggu,
         status,
      };
   });
}

function csvEscape(value: string | number) {
   return `"${String(value).replace(/"/g, '""')}"`;
}

function getStatusLabel(status: ReconciliationRow["status"]) {
   if (status === "siap") return "Siap";
   if (status === "perlu perhatian") return "Perlu Perhatian";
   return "Belum Ada Armada";
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
   const csv = [headers, ...rows]
      .map((row) => row.map((cell) => csvEscape(cell)).join(","))
      .join("\n");
   const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
   const url = URL.createObjectURL(blob);
   const anchor = document.createElement("a");
   anchor.href = url;
   anchor.download = filename;
   anchor.click();
   URL.revokeObjectURL(url);
}

export const RekonsiliasiPanel = memo(function RekonsiliasiPanelContent({
   poAktif,
   poMenunggu,
   armada,
}: {
   poAktif: PO[];
   poMenunggu: PO[];
   armada: Armada[];
}) {
   // Memoize heavy computations
   const rows = useMemo(() => {
      const builtRows = buildRows(poAktif, armada).sort((a, b) => {
         const priority = {
            "perlu perhatian": 0,
            "belum ada armada": 1,
            siap: 2,
         };
         return priority[a.status] - priority[b.status];
      });
      return builtRows;
   }, [poAktif, armada]);

   // Memoize stats calculations
   const stats = useMemo(() => {
      const totalArmada = armada.length;
      const armadaTerverifikasi = armada.filter(
         (item) => item.status_verifikasi === "terverifikasi",
      ).length;
      const armadaMenunggu = armada.filter(
         (item) => item.status_verifikasi === "menunggu",
      ).length;
      const poTanpaArmada = rows.filter(
         (row) => row.status === "belum ada armada",
      ).length;

      return {
         totalArmada,
         armadaTerverifikasi,
         armadaMenunggu,
         poTanpaArmada,
      };
   }, [armada, rows]);

   const handleExportCSV = () => {
      downloadCsv(
         `rekonsiliasi-data-sumber-${new Date().toISOString().slice(0, 10)}.csv`,
         [
            "Kode PO",
            "Nama PO",
            "Armada",
            "Terverifikasi",
            "Menunggu",
            "Status",
         ],
         rows.map((row) => [
            row.po.kode_po,
            row.po.nama_perusahaan,
            row.totalArmada,
            row.armadaTerverifikasi,
            row.armadaMenunggu,
            getStatusLabel(row.status),
         ]),
      );
   };

   return (
      <div className="space-y-5">
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
               title="PO Aktif"
               value={String(poAktif.length)}
               description="Sumber pembanding utama"
               icon="users"
               accent="green"
               index={0}
            />
            <DashboardCard
               title="Armada Total"
               value={String(stats.totalArmada)}
               description="Semua data armada aktif"
               icon="bus"
               accent="blue"
               index={1}
            />
            <DashboardCard
               title="Siap Padanan"
               value={String(stats.armadaTerverifikasi)}
               description="Data armada terverifikasi"
               icon="check-circle"
               accent="green"
               index={2}
            />
            <DashboardCard
               title="Perlu Perhatian"
               value={String(stats.armadaMenunggu + stats.poTanpaArmada)}
               description="Menunggu tindak lanjut"
               icon="alert-triangle"
               accent="amber"
               index={3}
            />
         </div>

          <Card className="border-border">
             <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                   <CardTitle className="text-base">
                      Status Rekonsiliasi Data PO
                   </CardTitle>
                   <p className="text-sm text-muted-foreground mt-1">
                      Pemadanan data armada terhadap status verifikasi PO untuk
                      memastikan data pembanding siap digunakan.
                   </p>
                </div>
                <Button
                   variant="outline"
                   size="sm"
                   onClick={handleExportCSV}
                   disabled={rows.length === 0}
                   className="shrink-0"
                >
                   <Download className="h-4 w-4 mr-1.5" />
                   CSV
                </Button>
             </CardHeader>
            <CardContent>
               <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <Table caption="Daftar status rekonsiliasi armada">
                     <TableHeader>
                        <TableRow>
                           <TableHead>Kode PO</TableHead>
                           <TableHead>Nama PO</TableHead>
                           <TableHead className="text-center">Armada</TableHead>
                           <TableHead className="text-center">
                              Terverifikasi
                           </TableHead>
                           <TableHead className="text-center">
                              Menunggu
                           </TableHead>
                           <TableHead>Status</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {rows.length === 0 ? (
                           <TableRow>
                              <TableCell
                                 colSpan={6}
                                 className="py-8 text-center text-sm text-muted-foreground"
                              >
                                 Belum ada PO aktif untuk direkonsiliasi.
                              </TableCell>
                           </TableRow>
                        ) : (
                           rows.map((row) => (
                              <TableRow key={row.po.id}>
                                  <TableCell className="font-medium text-foreground">
                                    {row.po.kode_po}
                                 </TableCell>
                                 <TableCell>{row.po.nama_perusahaan}</TableCell>
                                 <TableCell className="text-center">
                                    {row.totalArmada}
                                 </TableCell>
                                 <TableCell className="text-center">
                                    {row.armadaTerverifikasi}
                                 </TableCell>
                                 <TableCell className="text-center">
                                    {row.armadaMenunggu}
                                 </TableCell>
                                 <TableCell>
                                    {row.status === "siap" && (
                                       <Badge className="bg-emerald-100 text-brand-green border-emerald-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800 hover:bg-emerald-100">
                                          Siap
                                       </Badge>
                                    )}
                                    {row.status === "perlu perhatian" && (
                                       <Badge className="bg-amber-100 text-accent border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100">
                                          Perlu Perhatian
                                       </Badge>
                                    )}
                                    {row.status === "belum ada armada" && (
                                       <Badge className="bg-muted text-foreground border-border hover:bg-muted">
                                          Belum Ada Armada
                                       </Badge>
                                    )}
                                 </TableCell>
                              </TableRow>
                           ))
                        )}
                     </TableBody>
                  </Table>
               </div>
            </CardContent>
         </Card>

         <Card className="border-border bg-muted/50">
            <CardContent className="pt-5 text-sm text-muted-foreground">
               {poMenunggu.length} PO masih menunggu verifikasi awal sebelum
               masuk ke proses rekonsiliasi penuh.
            </CardContent>
         </Card>
      </div>
   );
});
