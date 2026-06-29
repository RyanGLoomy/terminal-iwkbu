"use client";

import { useEffect, useState } from "react";
import { getTerminalReport } from "@/lib/supabase/queries/operasional.client";
import type { AdminRekapRow } from "@/lib/supabase/queries/operasional.types";
import { exportXlsx } from "@/lib/export/xlsx.client";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Input } from "@/components/ui/input";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogIn, LogOut, Search, TrendingUp } from "lucide-react";

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

export function AdminRekapPanel({ terminalId }: { terminalId: string }) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
       const today = new Date().toISOString().slice(0, 10);
       setStartDate(today);
       setEndDate(today);
    }, []);
   const [rows, setRows] = useState<AdminRekapRow[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [search, setSearch] = useState("");

   const filteredRows = (() => {
      const q = search.trim().toLowerCase();
      if (!q) return rows;
      return rows.filter(
         (r) =>
            r.nomor_polisi.toLowerCase().includes(q) ||
            (r.po_kode ?? "").toLowerCase().includes(q) ||
            (r.po_nama ?? "").toLowerCase().includes(q),
      );
   })();

   useEffect(() => {
      let mounted = true;

       const load = async () => {
          if (!startDate || !endDate) return;
          setLoading(true);
          setError(null);

          try {
             const data = await getTerminalReport({
                terminalId,
                startDate,
                endDate,
             });
             if (!mounted) return;
             setRows(data.rows);
         } catch (err: unknown) {
            if (!mounted) return;
            setError(err instanceof Error ? err.message : "Gagal memuat rekap");
         } finally {
            if (mounted) setLoading(false);
         }
      };

      load();
      return () => {
         mounted = false;
      };
   }, [startDate, endDate, terminalId]);

   const totalMasuk = rows.length;
   const totalKeluar = rows.filter((r) => r.waktu_keluar).length;
   const masihDiTerminal = totalMasuk - totalKeluar;

   const handleExportXLSX = async () => {
      if (rows.length === 0) return;
      try {
         await exportXlsx(`rekap-terminal-${startDate}-${endDate}.xlsx`, [
            {
               name: "Rekap",
               rows: [
                  [
                     "Nomor Polisi",
                     "Kode PO",
                     "Nama PO",
                     "Armada",
                     "Petugas",
                     "Waktu Masuk",
                     "Waktu Keluar",
                  ],
                  ...rows.map((r) => [
                     r.nomor_polisi,
                     r.po_kode,
                     r.po_nama,
                     [r.armada_merk, r.armada_tipe].filter(Boolean).join(" ") ||
                        r.armada_lambung ||
                        "-",
                     r.petugas_nama ?? "-",
                     r.waktu_masuk,
                     r.waktu_keluar ?? "",
                  ]),
               ],
            },
         ]);
      } catch {
      }
   };

   return (
      <div className="space-y-5">
         {/* Summary cards */}
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardCard
               title="Total Masuk"
               value={String(totalMasuk)}
               icon={LogIn}
               accent="blue"
               index={0}
            />
            <DashboardCard
               title="Total Keluar"
               value={String(totalKeluar)}
               icon={LogOut}
               accent="green"
               index={1}
            />
            <DashboardCard
               title="Masih di Terminal"
               value={String(masihDiTerminal)}
               icon={TrendingUp}
               accent="amber"
               index={2}
            />
         </div>

         {/* Detail table */}
         <Card className="card-interactive border-base-300">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4">
               <div>
                  <CardTitle className="text-base">
                     Detail Kendaraan Masuk / Keluar
                  </CardTitle>
                  <p className="text-sm text-base-content/70 mt-1">
                     {startDate === endDate
                        ? `Data untuk ${new Date(
                             `${startDate}T00:00:00`,
                          ).toLocaleDateString("id-ID", {
                             day: "numeric",
                             month: "long",
                             year: "numeric",
                          })}`
                        : `Data rentang ${startDate} sampai ${endDate}`}
                  </p>
               </div>
               <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="w-full sm:w-[180px]">
                     <DatePicker value={startDate} onChange={setStartDate} />
                  </div>
                  <div className="w-full sm:w-[180px]">
                     <DatePicker value={endDate} onChange={setEndDate} />
                  </div>
               </div>
               <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <div className="relative w-full sm:w-48">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/70" aria-hidden="true" />
                     <Input
                        placeholder="Cari nopol, PO..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-8 text-sm"
                     />
                  </div>
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={handleExportXLSX}
                     disabled={rows.length === 0 || loading}
                  >
                     XLSX
                  </Button>
               </div>
            </CardHeader>
            <CardContent>
               {error && (
                  <div className="text-sm text-error mb-4 animate-fade-in">
                     {error}
                  </div>
               )}
               <div className="border border-base-300 rounded-lg bg-base-100 overflow-hidden">
                  <Table caption="Rekap transaksi terminal">
                     <TableHeader>
                        <TableRow>
                           <TableHead>Nomor Polisi</TableHead>
                           <TableHead>PO</TableHead>
                           <TableHead>Armada</TableHead>
                           <TableHead>Petugas</TableHead>
                           <TableHead>Masuk</TableHead>
                           <TableHead>Keluar</TableHead>
                           <TableHead>Status</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {loading ? (
                           <TableRow>
                              <TableCell colSpan={7}>
                                 <div className="flex items-center gap-2 text-base-content/70">
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    Memuat data…
                                 </div>
                              </TableCell>
                           </TableRow>
                         ) : filteredRows.length === 0 ? (
                            <TableRow>
                               <TableCell
                                  colSpan={7}
                                  className="text-base-content/70"
                               >
                                  {rows.length === 0
                                     ? "Tidak ada data pada tanggal ini."
                                     : "Tidak ada hasil yang cocok dengan pencarian."}
                               </TableCell>
                            </TableRow>
                         ) : (
                            filteredRows.map((row) => {
                              const status = row.waktu_keluar
                                 ? "keluar"
                                 : "masuk";
                              return (
                                 <TableRow key={row.masuk_id}>
                                    <TableCell className="font-medium">
                                       {row.nomor_polisi}
                                    </TableCell>
                                    <TableCell>
                                       {row.po_kode} - {row.po_nama}
                                    </TableCell>
                                    <TableCell>
                                       {[row.armada_merk, row.armada_tipe]
                                          .filter(Boolean)
                                          .join(" ") ||
                                          row.armada_lambung ||
                                          "-"}
                                    </TableCell>
                                    <TableCell>
                                       {row.petugas_nama ?? "-"}
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
                                             : "Di Terminal"}
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
      </div>
   );
}
