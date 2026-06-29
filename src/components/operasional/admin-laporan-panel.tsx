"use client";

import { useEffect, useState } from "react";
import { formatDateTime, formatDateTimeCustom } from "@/lib/utils/format-date";
import { getTerminalReport } from "@/lib/supabase/queries/operasional.client";
import { exportXlsx } from "@/lib/export/xlsx.client";
import type {
   AdminRekapRow,
   TerminalReport,
   TerminalReportArmadaRow,
   TerminalReportPeriodRow,
   TerminalReportPetugasRow,
   TerminalReportPoRow,
} from "@/lib/supabase/queries/operasional.types";
import { DatePicker } from "@/components/ui/date-picker";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Bus, Download, Loader2, LogIn, LogOut, TrendingUp } from "lucide-react";

type ExportCell = string | number | null | undefined;

function formatDate(value: string) {
   return formatDateTimeCustom(`${value}T00:00:00`, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
   });
}

function getArmadaLabel(row: AdminRekapRow) {
   return (
      [row.armada_merk, row.armada_tipe].filter(Boolean).join(" ") ||
      row.armada_lambung ||
      "-"
   );
}

function csvEscape(value: ExportCell) {
   return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadBlob(filename: string, blob: Blob) {
   const url = URL.createObjectURL(blob);
   const anchor = document.createElement("a");
   anchor.href = url;
   anchor.download = filename;
   anchor.click();
   URL.revokeObjectURL(url);
}

function toCsv(headers: string[], rows: ExportCell[][]) {
   return [headers, ...rows]
      .map((row) => row.map((cell) => csvEscape(cell)).join(","))
      .join("\n");
}

function detailExportRows(rows: AdminRekapRow[]) {
   return rows.map((row) => [
      row.nomor_polisi,
      row.po_kode,
      row.po_nama,
      getArmadaLabel(row),
      row.petugas_nama ?? "-",
      formatDateTime(row.waktu_masuk),
      formatDateTime(row.waktu_keluar),
   ]);
}

function periodRows(rows: TerminalReportPeriodRow[]) {
   return rows.map((row) => [
      row.label,
      row.total_masuk,
      row.total_keluar,
      row.di_terminal,
   ]);
}

function choosePeriodRows(report: TerminalReport | null) {
   if (!report) return [];
   if (report.per_bulan.length > 1) return report.per_bulan;
   if (report.per_minggu.length > 1) return report.per_minggu;
   return report.per_hari;
}

const detailHeaders = [
   "Nomor Polisi",
   "Kode PO",
   "Nama PO",
   "Armada",
   "Petugas",
   "Waktu Masuk",
   "Waktu Keluar",
];

const summaryHeaders = ["Kategori", "Masuk", "Keluar", "Di Terminal"];

function PeriodeTable({ rows }: { rows: TerminalReportPeriodRow[] }) {
   return (
      <Card className="border-base-300">
         <CardHeader>
            <CardTitle className="text-base">Ringkasan Periode</CardTitle>
            <p className="text-sm text-base-content/70 mt-1">
               Agregasi harian, mingguan, atau bulanan sesuai rentang laporan.
            </p>
         </CardHeader>
         <CardContent>
            <div className="overflow-hidden rounded-lg border border-base-300 bg-base-100">
               <Table caption="Laporan ringkasan harian">
                  <TableHeader>
                     <TableRow>
                        <TableHead>Periode</TableHead>
                        <TableHead className="text-center">Masuk</TableHead>
                        <TableHead className="text-center">Keluar</TableHead>
                        <TableHead className="text-center">Di Terminal</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {rows.length === 0 ? (
                        <TableRow>
                           <TableCell
                              colSpan={4}
                              className="py-6 text-center text-sm text-base-content/70"
                           >
                              Belum ada data periode.
                           </TableCell>
                        </TableRow>
                     ) : (
                        rows.map((row) => (
                           <TableRow key={row.period_key}>
                              <TableCell className="font-medium">
                                 {row.label}
                              </TableCell>
                              <TableCell className="text-center font-semibold text-primary">
                                 {row.total_masuk}
                              </TableCell>
                              <TableCell className="text-center font-semibold text-brand-green">
                                 {row.total_keluar}
                              </TableCell>
                              <TableCell className="text-center font-semibold text-accent">
                                 {row.di_terminal}
                              </TableCell>
                           </TableRow>
                        ))
                     )}
                  </TableBody>
               </Table>
            </div>
         </CardContent>
      </Card>
   );
}

function PetugasTable({ rows }: { rows: TerminalReportPetugasRow[] }) {
   return (
      <Card className="border-base-300">
         <CardHeader>
            <CardTitle className="text-base">Rekap Per Petugas</CardTitle>
            <p className="text-sm text-base-content/70 mt-1">
               Produktivitas transaksi masuk dan keluar per petugas.
            </p>
         </CardHeader>
         <CardContent>
            <div className="max-h-[360px] overflow-auto rounded-lg border border-base-300 bg-base-100">
               <Table caption="Laporan per PO">
                  <TableHeader>
                     <TableRow>
                        <TableHead>Petugas</TableHead>
                        <TableHead className="text-center">Masuk</TableHead>
                        <TableHead className="text-center">Keluar</TableHead>
                        <TableHead className="text-center">Di Terminal</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {rows.length === 0 ? (
                        <TableRow>
                           <TableCell
                              colSpan={4}
                              className="py-6 text-center text-sm text-base-content/70"
                           >
                              Belum ada data petugas.
                           </TableCell>
                        </TableRow>
                     ) : (
                        rows.map((row) => (
                           <TableRow key={row.petugas_nama}>
                              <TableCell className="font-medium">
                                 {row.petugas_nama}
                              </TableCell>
                              <TableCell className="text-center font-semibold text-primary">
                                 {row.total_masuk}
                              </TableCell>
                              <TableCell className="text-center font-semibold text-brand-green">
                                 {row.total_keluar}
                              </TableCell>
                              <TableCell className="text-center font-semibold text-accent">
                                 {row.di_terminal}
                              </TableCell>
                           </TableRow>
                        ))
                     )}
                  </TableBody>
               </Table>
            </div>
         </CardContent>
      </Card>
   );
}

function ArmadaTable({ rows }: { rows: TerminalReportArmadaRow[] }) {
   return (
      <Card className="border-base-300">
         <CardHeader>
            <CardTitle className="text-base">Rekap Per Armada</CardTitle>
            <p className="text-sm text-base-content/70 mt-1">
               Kendaraan paling aktif pada rentang laporan terpilih.
            </p>
         </CardHeader>
         <CardContent>
            <div className="max-h-[420px] overflow-auto rounded-lg border border-base-300 bg-base-100">
               <Table caption="Laporan per armada">
                  <TableHeader>
                     <TableRow>
                        <TableHead>No. Polisi</TableHead>
                        <TableHead>PO</TableHead>
                        <TableHead>Armada</TableHead>
                        <TableHead className="text-center">Masuk</TableHead>
                        <TableHead className="text-center">Keluar</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {rows.length === 0 ? (
                        <TableRow>
                           <TableCell
                              colSpan={5}
                              className="py-6 text-center text-sm text-base-content/70"
                           >
                              Belum ada data armada.
                           </TableCell>
                        </TableRow>
                     ) : (
                        rows.map((row) => (
                           <TableRow key={row.nomor_polisi}>
                              <TableCell className="font-mono font-medium">
                                 {row.nomor_polisi}
                              </TableCell>
                              <TableCell>
                                 {row.po_kode} - {row.po_nama}
                              </TableCell>
                              <TableCell>{row.armada_label}</TableCell>
                              <TableCell className="text-center font-semibold text-primary">
                                 {row.total_masuk}
                              </TableCell>
                              <TableCell className="text-center font-semibold text-brand-green">
                                 {row.total_keluar}
                              </TableCell>
                           </TableRow>
                        ))
                     )}
                  </TableBody>
               </Table>
            </div>
         </CardContent>
      </Card>
   );
}

export function AdminLaporanPanel({ terminalId }: { terminalId: string }) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
       const today = new Date().toISOString().slice(0, 10);
       setStartDate(today);
       setEndDate(today);
    }, []);
   const [report, setReport] = useState<TerminalReport | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

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
             setReport(data);
         } catch (err: unknown) {
            if (!mounted) return;
            setError(
               err instanceof Error ? err.message : "Gagal memuat laporan",
            );
            setReport(null);
         } finally {
            if (mounted) setLoading(false);
         }
      };

      load();
      return () => {
         mounted = false;
      };
   }, [startDate, endDate, terminalId]);

   const rows = report?.rows ?? [];
   const perPO = report?.per_po ?? [];
   const perPetugas = report?.per_petugas ?? [];
   const perArmada = report?.per_armada ?? [];
   const selectedPeriodRows = choosePeriodRows(report);
   const totalMasuk = report?.summary.total_masuk ?? 0;
   const totalKeluar = report?.summary.total_keluar ?? 0;
   const masihDiTerminal = report?.summary.masih_di_terminal ?? 0;

   const handleExportCSV = () => {
      if (rows.length === 0) return;

      const csv = toCsv(detailHeaders, detailExportRows(rows));
      downloadBlob(
         `laporan-terminal-detail-${startDate}-${endDate}.csv`,
         new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      );
   };

   const handleExportXLSX = async () => {
      if (!report || rows.length === 0) return;
      try {
         await exportXlsx(`laporan-terminal-${startDate}-${endDate}.xlsx`, [
            {
               name: "Detail",
               rows: [detailHeaders, ...detailExportRows(rows)],
            },
            {
               name: "Per PO",
               rows: [
                  summaryHeaders,
                  ...report.per_po.map((row) => [
                     `${row.po_kode} - ${row.po_nama}`,
                     row.total_masuk,
                     row.total_keluar,
                     row.di_terminal,
                  ]),
               ],
            },
            {
               name: "Per Petugas",
               rows: [
                  summaryHeaders,
                  ...report.per_petugas.map((row) => [
                     row.petugas_nama,
                     row.total_masuk,
                     row.total_keluar,
                     row.di_terminal,
                  ]),
               ],
            },
            {
               name: "Per Armada",
               rows: [
                  ["No. Polisi", "PO", "Armada", "Masuk", "Keluar", "Di Terminal"],
                  ...report.per_armada.map((row) => [
                     row.nomor_polisi,
                     `${row.po_kode} - ${row.po_nama}`,
                     row.armada_label,
                     row.total_masuk,
                     row.total_keluar,
                     row.di_terminal,
                  ]),
               ],
            },
            {
               name: "Periode",
               rows: [summaryHeaders, ...periodRows(selectedPeriodRows)],
            },
          ]);
       } catch {
       }
    };

   const handleExportPDF = async () => {
      if (!report || rows.length === 0) return;
      try {
         const { jsPDF } = await import("jspdf");
         type JsPdfDoc = InstanceType<typeof jsPDF>;
         const autoTable = (await import("jspdf-autotable")).default as (
            doc: JsPdfDoc,
            options: Record<string, unknown>,
         ) => void;

         const doc = new jsPDF({ orientation: "landscape" });
         doc.text(`Laporan Terminal ${startDate} - ${endDate}`, 14, 12);
         autoTable(doc, {
            head: [["Indikator", "Nilai"]],
            body: [
               ["Total Masuk", report.summary.total_masuk],
               ["Total Keluar", report.summary.total_keluar],
               ["Masih di Terminal", report.summary.masih_di_terminal],
               ["Jumlah PO", report.summary.jumlah_po],
               ["Jumlah Petugas", report.summary.jumlah_petugas],
               ["Jumlah Armada", report.summary.jumlah_armada],
            ],
            startY: 18,
         });
         autoTable(doc, {
            head: [summaryHeaders],
            body: report.per_po.map((row) => [
               `${row.po_kode} - ${row.po_nama}`,
               row.total_masuk,
               row.total_keluar,
               row.di_terminal,
            ]),
            startY: 64,
         });

          doc.save(`laporan-terminal-${startDate}-${endDate}.pdf`);
       } catch {
       }
    };

   return (
      <div className="space-y-5">
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <DashboardCard
               title="Jumlah PO"
               value={String(report?.summary.jumlah_po ?? 0)}
               icon={Bus}
               accent="violet"
               index={3}
            />
         </div>

         <Card className="card-interactive border-base-300">
            <CardHeader className="flex flex-col gap-3 pb-4 xl:flex-row xl:items-center xl:justify-between">
               <div>
                  <CardTitle className="text-base">
                     Laporan Per Perusahaan Otobus
                  </CardTitle>
                  <p className="text-sm text-base-content/70 mt-1">
                     {startDate === endDate
                        ? formatDate(startDate)
                        : `${formatDate(startDate)} - ${formatDate(endDate)}`}
                  </p>
               </div>
               <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="w-full sm:w-[180px]">
                     <DatePicker value={startDate} onChange={setStartDate} />
                  </div>
                  <div className="w-full sm:w-[180px]">
                     <DatePicker value={endDate} onChange={setEndDate} />
                  </div>
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={handleExportCSV}
                     disabled={rows.length === 0 || loading}
                     className="shrink-0"
                  >
                     <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />
                     CSV Detail
                  </Button>
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={handleExportXLSX}
                     disabled={rows.length === 0 || loading}
                     className="shrink-0"
                  >
                     XLSX
                  </Button>
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={handleExportPDF}
                     disabled={rows.length === 0 || loading}
                     className="shrink-0"
                  >
                     PDF
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
                  <Table caption="Riwayat transaksi laporan">
                     <TableHeader>
                        <TableRow>
                           <TableHead>Kode PO</TableHead>
                           <TableHead>Nama Perusahaan</TableHead>
                           <TableHead className="text-center">Masuk</TableHead>
                           <TableHead className="text-center">Keluar</TableHead>
                           <TableHead className="text-center">
                              Di Terminal
                           </TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {loading ? (
                           <TableRow>
                              <TableCell colSpan={5}>
                                 <div className="flex items-center gap-2 text-base-content/70">
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    Memuat laporan…
                                 </div>
                              </TableCell>
                           </TableRow>
                        ) : perPO.length === 0 ? (
                           <TableRow>
                              <TableCell
                                 colSpan={5}
                                 className="text-base-content/70"
                              >
                                 Tidak ada data pada rentang tanggal ini.
                              </TableCell>
                           </TableRow>
                        ) : (
                           <>
                              {perPO.map((po: TerminalReportPoRow) => (
                                 <TableRow key={po.po_kode}>
                                    <TableCell className="font-medium">
                                       {po.po_kode}
                                    </TableCell>
                                    <TableCell>{po.po_nama}</TableCell>
                                    <TableCell className="text-center font-semibold text-primary">
                                       {po.total_masuk}
                                    </TableCell>
                                    <TableCell className="text-center font-semibold text-brand-green">
                                       {po.total_keluar}
                                    </TableCell>
                                    <TableCell className="text-center font-semibold text-accent">
                                       {po.di_terminal}
                                    </TableCell>
                                 </TableRow>
                              ))}
                              <TableRow className="bg-base-200/50 font-semibold">
                                 <TableCell colSpan={2}>Total</TableCell>
                                 <TableCell className="text-center text-primary">
                                    {totalMasuk}
                                 </TableCell>
                                 <TableCell className="text-center text-brand-green">
                                    {totalKeluar}
                                 </TableCell>
                                 <TableCell className="text-center text-accent">
                                    {masihDiTerminal}
                                 </TableCell>
                              </TableRow>
                           </>
                        )}
                     </TableBody>
                  </Table>
               </div>
            </CardContent>
         </Card>

         <div className="grid gap-5 xl:grid-cols-2">
            <PeriodeTable rows={selectedPeriodRows} />
            <PetugasTable rows={perPetugas} />
         </div>

         <ArmadaTable rows={perArmada} />
      </div>
   );
}
