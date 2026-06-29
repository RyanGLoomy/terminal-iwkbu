"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils/format-date";
import {
   getRekapSesi,
   getDetailSesi,
} from "@/lib/supabase/queries/operasional.client";
import type {
   RekapSesiRow,
   DetailSesiRow,
} from "@/lib/supabase/queries/operasional.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Activity, ChevronLeft, Eye, Loader2 } from "lucide-react";

function toDateString(date: Date) {
   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface RekapSesiPanelProps {
   terminalId: string;
}

export function RekapSesiPanel({ terminalId }: RekapSesiPanelProps) {
   const today = toDateString(new Date());
   const [startDate, setStartDate] = useState(today);
   const [endDate, setEndDate] = useState(today);
   const [sesiList, setSesiList] = useState<RekapSesiRow[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   // Detail sesi dialog
   const [selectedSesi, setSelectedSesi] = useState<RekapSesiRow | null>(null);
   const [detailRows, setDetailRows] = useState<DetailSesiRow[]>([]);
   const [detailLoading, setDetailLoading] = useState(false);
   const [detailOpen, setDetailOpen] = useState(false);

   const loadSesiList = async () => {
      setLoading(true);
      setError(null);
      try {
         const data = await getRekapSesi(terminalId, startDate, endDate);
         setSesiList(data);
      } catch (err: unknown) {
         const message =
            err instanceof Error ? err.message : "Gagal memuat rekap sesi";
         setError(message);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      loadSesiList();
   }, [terminalId]);

   const handleFilter = () => {
      loadSesiList();
   };

   const handleOpenDetail = async (sesi: RekapSesiRow) => {
      setSelectedSesi(sesi);
      setDetailOpen(true);
      setDetailLoading(true);
      try {
         const data = await getDetailSesi(sesi.sesi_id);
         setDetailRows(data);
      } catch (err: unknown) {
         setDetailRows([]);
      } finally {
         setDetailLoading(false);
      }
   };

   // Summary
   const totalSesi = sesiList.length;
   const sesiAktif = sesiList.filter((s) => s.status === "aktif").length;
   const totalMasuk = sesiList.reduce(
      (acc, s) => acc + s.total_transaksi_masuk,
      0,
   );
   const totalKeluar = sesiList.reduce(
      (acc, s) => acc + s.total_transaksi_keluar,
      0,
   );

   return (
      <div className="space-y-5">
         {/* Filter */}
         <Card className="border-base-300">
            <CardContent className="pt-6">
               <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium text-base-content">
                        Tanggal Mulai
                     </label>
                     <DatePicker value={startDate} onChange={setStartDate} />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium text-base-content">
                        Tanggal Akhir
                     </label>
                     <DatePicker value={endDate} onChange={setEndDate} />
                  </div>
                  <Button onClick={handleFilter} disabled={loading} size="sm">
                     {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                     ) : null}
                     Filter
                  </Button>
               </div>
            </CardContent>
         </Card>

         {/* Error */}
         {error && (
            <Alert variant="destructive" className="animate-fade-in">
               <AlertTitle>Terjadi Kesalahan</AlertTitle>
               <AlertDescription>{error}</AlertDescription>
            </Alert>
         )}

         {/* Summary Cards */}
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-base-300">
               <CardContent className="pt-6">
                  <div className="text-sm text-base-content/70">
                     Total Sesi
                  </div>
                  <div className="text-2xl font-bold">{totalSesi}</div>
               </CardContent>
            </Card>
            <Card className="border-base-300">
               <CardContent className="pt-6">
                  <div className="text-sm text-base-content/70">
                     Sesi Aktif
                  </div>
                  <div className="text-2xl font-bold text-brand-green">
                     {sesiAktif}
                  </div>
               </CardContent>
            </Card>
            <Card className="border-base-300">
               <CardContent className="pt-6">
                  <div className="text-sm text-base-content/70">
                     Total Masuk
                  </div>
                  <div className="text-2xl font-bold text-primary">
                     {totalMasuk}
                  </div>
               </CardContent>
            </Card>
            <Card className="border-base-300">
               <CardContent className="pt-6">
                  <div className="text-sm text-base-content/70">
                     Total Keluar
                  </div>
                  <div className="text-2xl font-bold text-violet-600">
                     {totalKeluar}
                  </div>
               </CardContent>
            </Card>
         </div>

         {/* Session List Table */}
         <Card className="border-base-300">
            <CardHeader className="pb-4">
               <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" aria-hidden="true" />
                  Daftar Sesi Kerja
               </CardTitle>
            </CardHeader>
            <CardContent>
               {loading ? (
                  <div className="flex items-center gap-2 text-sm text-base-content/70 py-8 justify-center">
                     <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                     Memuat data…
                  </div>
               ) : sesiList.length === 0 ? (
                  <div className="text-sm text-base-content/70 text-center py-8">
                     Tidak ada data sesi pada rentang tanggal ini.
                  </div>
               ) : (
                  <Table caption="Daftar sesi kerja petugas">
                        <TableHeader>
                           <TableRow>
                              <TableHead>Petugas</TableHead>
                              <TableHead>Waktu Mulai</TableHead>
                              <TableHead>Waktu Selesai</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">
                                 Masuk
                              </TableHead>
                              <TableHead className="text-right">
                                 Keluar
                              </TableHead>
                              <TableHead className="text-center">
                                 Detail
                              </TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {sesiList.map((sesi) => (
                              <TableRow key={sesi.sesi_id}>
                                 <TableCell className="font-medium">
                                    {sesi.petugas_nama}
                                 </TableCell>
                                 <TableCell>
                                    {formatDateTime(sesi.waktu_mulai)}
                                 </TableCell>
                                 <TableCell>
                                    {sesi.waktu_selesai
                                       ? formatDateTime(sesi.waktu_selesai)
                                       : "-"}
                                 </TableCell>
                                 <TableCell>
                                    <Badge
                                       className={`text-xs ${
                                          sesi.status === "aktif"
                                             ? "bg-emerald-50 text-brand-green dark:bg-green-950/50 dark:text-green-300 border-emerald-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800"
                                             : "bg-base-200 text-base-content/70 border-base-300"
                                       }`}
                                    >
                                       {sesi.status === "aktif"
                                          ? "Aktif"
                                          : "Selesai"}
                                    </Badge>
                                 </TableCell>
                                 <TableCell className="text-right">
                                    {sesi.total_transaksi_masuk}
                                 </TableCell>
                                 <TableCell className="text-right">
                                    {sesi.total_transaksi_keluar}
                                 </TableCell>
                                 <TableCell className="text-center">
                                    <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => handleOpenDetail(sesi)}
                                    >
                                       <Eye className="h-4 w-4" />
                                    </Button>
                                 </TableCell>
                              </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                )}
             </CardContent>
         </Card>

         {/* Detail Dialog */}
         <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                     <Activity className="h-5 w-5" aria-hidden="true" />
                     Detail Sesi Kerja
                  </DialogTitle>
               </DialogHeader>

               {selectedSesi && (
                  <div className="space-y-4">
                     <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                           <div className="text-sm text-base-content/70">
                              Petugas
                           </div>
                           <div className="font-medium">
                              {selectedSesi.petugas_nama}
                           </div>
                        </div>
                        <div>
                           <div className="text-sm text-base-content/70">
                              Status
                           </div>
                           <Badge
                              className={`text-xs ${
                                 selectedSesi.status === "aktif"
                                    ? "bg-emerald-50 text-brand-green dark:bg-green-950/50 dark:text-green-300 border-emerald-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800"
                                    : "bg-base-200 text-base-content/70 border-base-300"
                              }`}
                           >
                              {selectedSesi.status === "aktif"
                                 ? "Aktif"
                                 : "Selesai"}
                           </Badge>
                        </div>
                        <div>
                           <div className="text-sm text-base-content/70">
                              Waktu Mulai
                           </div>
                           <div className="font-medium">
                              {formatDateTime(selectedSesi.waktu_mulai)}
                           </div>
                        </div>
                        <div>
                           <div className="text-sm text-base-content/70">
                              Waktu Selesai
                           </div>
                           <div className="font-medium">
                              {selectedSesi.waktu_selesai
                                 ? formatDateTime(selectedSesi.waktu_selesai)
                                 : "-"}
                           </div>
                        </div>
                        <div>
                           <div className="text-sm text-base-content/70">
                              Total Masuk
                           </div>
                           <div className="font-bold text-primary">
                              {selectedSesi.total_transaksi_masuk}
                           </div>
                        </div>
                        <div>
                           <div className="text-sm text-base-content/70">
                              Total Keluar
                           </div>
                           <div className="font-bold text-violet-600">
                              {selectedSesi.total_transaksi_keluar}
                           </div>
                        </div>
                     </div>

                     <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3">
                           Daftar Transaksi
                        </h4>
                        {detailLoading ? (
                           <div className="flex items-center gap-2 text-sm text-base-content/70 py-4 justify-center">
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              Memuat transaksi…
                           </div>
                        ) : detailRows.length === 0 ? (
                           <div className="text-sm text-base-content/70 text-center py-4">
                              Belum ada transaksi dalam sesi ini.
                           </div>
                        ) : (
                           <Table caption="Daftar transaksi dalam sesi kerja">
                                 <TableHeader>
                                    <TableRow>
                                       <TableHead>No. Polisi</TableHead>
                                       <TableHead>PO</TableHead>
                                       <TableHead>Waktu Masuk</TableHead>
                                       <TableHead>Waktu Keluar</TableHead>
                                       <TableHead>Status</TableHead>
                                    </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                    {detailRows.map((row) => (
                                       <TableRow key={row.masuk_id}>
                                          <TableCell className="font-mono">
                                             {row.nomor_polisi}
                                          </TableCell>
                                          <TableCell>
                                             {row.po_kode} - {row.po_nama}
                                          </TableCell>
                                          <TableCell>
                                             {formatDateTime(row.waktu_masuk)}
                                          </TableCell>
                                          <TableCell>
                                             {row.waktu_keluar
                                                ? formatDateTime(
                                                     row.waktu_keluar,
                                                  )
                                                : "-"}
                                          </TableCell>
                                          <TableCell>
                                             <Badge
                                                className={`text-xs ${
                                                   row.waktu_keluar
                                                      ? "bg-violet-50 text-violet-700 border-violet-200/60 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800"
                                                      : "bg-primary/10 text-primary border-primary/25 dark:border-blue-800"
                                                }`}
                                             >
                                                {row.waktu_keluar
                                                   ? "Keluar"
                                                   : "Masuk"}
                                             </Badge>
                                          </TableCell>
                                       </TableRow>
                                    ))}
                                 </TableBody>
                              </Table>
                         )}
                      </div>
                  </div>
               )}
            </DialogContent>
         </Dialog>
      </div>
   );
}
