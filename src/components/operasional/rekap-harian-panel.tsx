"use client";

import { useEffect, useState } from "react";
import { getRekapHarian } from "@/lib/supabase/queries/operasional.client";
import type { RekapHarianRow } from "@/lib/supabase/queries/operasional.types";
import { exportXlsx } from "@/lib/export/xlsx.client";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusBadge: Record<string, string> = {
   masuk: "bg-amber-50 text-accent border border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
   keluar: "bg-emerald-50 text-brand-green dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
};

function formatDateTime(value: string | null) {
   if (!value) return "-";
   return new Date(value).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
   });
}

export function RekapHarianPanel() {
   const [tanggal, setTanggal] = useState(
      new Date().toISOString().slice(0, 10),
   );
   const [rows, setRows] = useState<RekapHarianRow[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      let mounted = true;

      const load = async () => {
         setLoading(true);
         setError(null);

         try {
            const data = await getRekapHarian(tanggal);
            if (!mounted) return;
            setRows(data);
         } catch (err: any) {
            if (!mounted) return;
            setError(err.message ?? "Gagal memuat rekap harian");
         } finally {
            if (mounted) setLoading(false);
         }
      };

      load();

      return () => {
         mounted = false;
      };
   }, [tanggal]);

   return (
      <Card className="border-border">
         <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4">
            <div>
               <CardTitle className="text-base">
                  Rekap Operasional Harian
               </CardTitle>
               <p className="text-sm text-muted-foreground mt-1">
                  Daftar kendaraan masuk dan keluar per tanggal.
               </p>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-full sm:w-[220px]">
                  <DatePicker value={tanggal} onChange={setTanggal} />
               </div>
                <Button
                   variant="outline"
                   size="sm"
                   onClick={() => {
                     if (rows.length === 0) return;

                     const headers = [
                        "Nomor Polisi",
                        "Kode PO",
                        "Nama PO",
                        "Armada",
                        "Waktu Masuk",
                        "Waktu Keluar",
                        "Status",
                     ];
                     const csvRows = rows.map((r) => [
                        r.nomor_polisi,
                        r.po?.kode_po ?? "",
                        r.po?.nama_perusahaan ?? "",
                        [r.armada?.merk, r.armada?.tipe].filter(Boolean).join(" ") ||
                           r.armada?.nomor_lambung ||
                           "-",
                        r.waktu_masuk,
                        r.waktu_keluar ?? "",
                        r.waktu_keluar ? "Keluar" : "Masuk",
                     ]);

                     const csv = [headers, ...csvRows]
                        .map((row) => row.map((cell) => `"${cell}"`).join(","))
                        .join("\n");

                     const blob = new Blob([csv], {
                        type: "text/csv;charset=utf-8;",
                     });
                     const url = URL.createObjectURL(blob);
                     const a = document.createElement("a");
                     a.href = url;
                     a.download = `rekap-harian-${tanggal}.csv`;
                     a.click();
                     URL.revokeObjectURL(url);
                  }}
                >
                    CSV
                 </Button>
                <Button
                   variant="outline"
                   size="sm"
                   onClick={async () => {
                      if (rows.length === 0) return;
                      try {
                          await exportXlsx(`rekap-harian-${tanggal}.xlsx`, [
                             {
                                name: "Rekap Harian",
                                rows: [
                                   [
                                      "Nomor Polisi",
                                      "Kode PO",
                                      "Nama PO",
                                      "Armada",
                                      "Waktu Masuk",
                                      "Waktu Keluar",
                                      "Status",
                                   ],
                                   ...rows.map((r) => [
                                      r.nomor_polisi,
                                      r.po?.kode_po ?? "",
                                      r.po?.nama_perusahaan ?? "",
                                      [r.armada?.merk, r.armada?.tipe]
                                         .filter(Boolean)
                                         .join(" ") ||
                                         r.armada?.nomor_lambung ||
                                         "-",
                                      r.waktu_masuk,
                                      r.waktu_keluar ?? "",
                                      r.waktu_keluar ? "Keluar" : "Masuk",
                                   ]),
                                ],
                             },
                          ]);
                      } catch {
                      }
                   }}
                >
                   XLSX
                </Button>
             </div>
          </CardHeader>
         <CardContent>
            {error && (
               <div className="text-sm text-destructive mb-4 animate-fade-in">
                  {error}
               </div>
            )}
            <div className="border border-border rounded-lg bg-card overflow-hidden">
               <Table caption="Rekap harian kendaraan">
                  <TableHeader>
                     <TableRow>
                        <TableHead>Nomor Polisi</TableHead>
                        <TableHead>PO</TableHead>
                        <TableHead>Armada</TableHead>
                        <TableHead>Waktu Masuk</TableHead>
                        <TableHead>Waktu Keluar</TableHead>
                        <TableHead>Status</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {loading ? (
                        <TableRow>
                           <TableCell colSpan={6}>Memuat data...</TableCell>
                        </TableRow>
                     ) : rows.length === 0 ? (
                        <TableRow>
                           <TableCell colSpan={6}>
                              Tidak ada data pada tanggal ini.
                           </TableCell>
                        </TableRow>
                     ) : (
                        rows.map((row) => {
                           const status = row.waktu_keluar ? "keluar" : "masuk";

                           return (
                              <TableRow key={row.id}>
                                 <TableCell className="font-medium">
                                    {row.nomor_polisi}
                                 </TableCell>
                                 <TableCell>
                                    {row.po
                                       ? `${row.po.kode_po} - ${row.po.nama_perusahaan}`
                                       : "-"}
                                 </TableCell>
                                 <TableCell>
                                    {row.armada
                                       ? `${row.armada.merk ?? ""} ${row.armada.tipe ?? ""}`.trim() ||
                                         row.armada.nomor_lambung ||
                                         "-"
                                       : "-"}
                                 </TableCell>
                                 <TableCell>
                                    {formatDateTime(row.waktu_masuk)}
                                 </TableCell>
                                 <TableCell>
                                    {formatDateTime(row.waktu_keluar)}
                                 </TableCell>
                                 <TableCell>
                                    <Badge className={statusBadge[status]}>
                                       {status === "keluar"
                                          ? "Keluar"
                                          : "Masuk"}
                                    </Badge>
                                 </TableCell>
                              </TableRow>
                           );
                        })
                     )}
                  </TableBody>
               </Table>
            </div>
         </CardContent>
      </Card>
   );
}
