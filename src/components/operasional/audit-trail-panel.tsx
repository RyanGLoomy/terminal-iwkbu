"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { LoadingState } from "@/components/shared/loading-state";
import type {
   ActivityLog,
   AksiLog,
} from "@/lib/supabase/queries/operasional.types";
import { Download, Loader2, Search } from "lucide-react";
import { getErrorMessage } from "@/lib/db-error";

const ACTION_OPTIONS: Array<{ value: AksiLog | "SEMUA"; label: string }> = [
   { value: "SEMUA", label: "Semua Aksi" },
   { value: "SET_PIN", label: "Set PIN" },
   { value: "BUKA_SESI", label: "Buka Sesi" },
   { value: "TUTUP_SESI", label: "Tutup Sesi" },
   { value: "INPUT_TRANSAKSI", label: "Input Transaksi" },
   { value: "BUAT_TEMUAN", label: "Buat Temuan" },
   { value: "UPDATE_TEMUAN", label: "Update Temuan" },
   { value: "KIRIM_KLARIFIKASI", label: "Kirim Klarifikasi" },
   { value: "LOGIN", label: "Login" },
   { value: "LOGOUT", label: "Logout" },
   { value: "UBAH_PASSWORD", label: "Ubah Password" },
   { value: "BUAT_USER", label: "Buat User" },
   { value: "UPDATE_USER", label: "Update User" },
   { value: "BUAT_TERMINAL", label: "Buat Terminal" },
   { value: "UPDATE_TERMINAL", label: "Update Terminal" },
   { value: "HAPUS_TERMINAL", label: "Hapus Terminal" },
   { value: "BUAT_JENIS_KENDARAAN", label: "Buat Jenis Kendaraan" },
   { value: "UPDATE_JENIS_KENDARAAN", label: "Update Jenis Kendaraan" },
   { value: "HAPUS_JENIS_KENDARAAN", label: "Hapus Jenis Kendaraan" },
   { value: "UPDATE_SETTINGS", label: "Update Pengaturan" },
   { value: "IMPORT_IWKBU", label: "Import IWKBU" },
   { value: "JALANKAN_SYNC", label: "Jalankan Sync" },
   { value: "TAMBAH_TINDAKAN", label: "Tambah Tindakan" },
   { value: "SELESAIKAN_TINDAKAN", label: "Selesaikan Tindakan" },
   { value: "BUKA_ULANG_TEMUAN", label: "Buka Ulang Temuan" },
   { value: "BUAT_ARMADA", label: "Buat Armada" },
   { value: "UPDATE_ARMADA", label: "Update Armada" },
   { value: "VERIFIKASI_ARMADA", label: "Verifikasi Armada" },
   { value: "EDIT_PO", label: "Edit PO" },
];

function getDateOffset(daysAgo: number) {
   const date = new Date();
   date.setDate(date.getDate() - daysAgo);
   return date.toISOString().slice(0, 10);
}

function formatDateTime(value: string) {
   return new Date(value).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
   });
}

function formatActionLabel(aksi: AksiLog) {
   switch (aksi) {
      case "SET_PIN":
         return "Set PIN";
      case "BUKA_SESI":
         return "Buka Sesi";
      case "TUTUP_SESI":
         return "Tutup Sesi";
      case "INPUT_TRANSAKSI":
         return "Input Transaksi";
      case "BUAT_TEMUAN":
         return "Buat Temuan";
      case "UPDATE_TEMUAN":
         return "Update Temuan";
      case "KIRIM_KLARIFIKASI":
         return "Kirim Klarifikasi";
      case "LOGIN":
         return "Login";
      case "LOGOUT":
         return "Logout";
      case "UBAH_PASSWORD":
         return "Ubah Password";
      case "BUAT_USER":
         return "Buat User";
      case "UPDATE_USER":
         return "Update User";
      case "BUAT_TERMINAL":
         return "Buat Terminal";
      case "UPDATE_TERMINAL":
         return "Update Terminal";
       case "HAPUS_TERMINAL":
          return "Hapus Terminal";
       case "BUAT_JENIS_KENDARAAN":
          return "Buat Jenis Kendaraan";
       case "UPDATE_JENIS_KENDARAAN":
          return "Update Jenis Kendaraan";
       case "HAPUS_JENIS_KENDARAAN":
          return "Hapus Jenis Kendaraan";
       case "UPDATE_SETTINGS":
          return "Update Pengaturan";
       case "IMPORT_IWKBU":
         return "Import IWKBU";
       case "JALANKAN_SYNC":
          return "Jalankan Sync";
       case "TAMBAH_TINDAKAN":
          return "Tambah Tindakan";
       case "SELESAIKAN_TINDAKAN":
          return "Selesaikan Tindakan";
       case "BUKA_ULANG_TEMUAN":
          return "Buka Ulang Temuan";
       case "BUAT_ARMADA":
          return "Buat Armada";
       case "UPDATE_ARMADA":
          return "Update Armada";
       case "VERIFIKASI_ARMADA":
          return "Verifikasi Armada";
       case "EDIT_PO":
          return "Edit PO";
       default:
         return aksi;
   }
}

function badgeClassForAction(aksi: AksiLog) {
   switch (aksi) {
      case "BUKA_SESI":
         return "bg-emerald-100 text-brand-green border-emerald-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800";
      case "TUTUP_SESI":
         return "bg-base-200 text-base-content border-base-300";
      case "INPUT_TRANSAKSI":
         return "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800";
      case "SET_PIN":
         return "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800";
      case "BUAT_TEMUAN":
         return "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800";
      case "UPDATE_TEMUAN":
         return "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800";
      case "KIRIM_KLARIFIKASI":
         return "bg-amber-100 text-accent border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
      case "LOGIN":
         return "bg-emerald-100 text-brand-green border-emerald-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800";
      case "LOGOUT":
         return "bg-base-200 text-base-content border-base-300";
      case "UBAH_PASSWORD":
         return "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800";
      case "BUAT_USER":
         return "bg-emerald-100 text-brand-green border-emerald-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800";
      case "UPDATE_USER":
         return "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800";
      case "BUAT_TERMINAL":
         return "bg-emerald-100 text-brand-green border-emerald-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800";
      case "UPDATE_TERMINAL":
         return "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800";
       case "HAPUS_TERMINAL":
          return "bg-red-100 text-error border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800";
       case "BUAT_JENIS_KENDARAAN":
          return "bg-emerald-100 text-brand-green border-emerald-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800";
       case "UPDATE_JENIS_KENDARAAN":
          return "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800";
       case "HAPUS_JENIS_KENDARAAN":
          return "bg-red-100 text-error border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800";
       case "UPDATE_SETTINGS":
          return "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800";
       case "IMPORT_IWKBU":
         return "bg-amber-100 text-accent border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
       case "JALANKAN_SYNC":
          return "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800";
       case "TAMBAH_TINDAKAN":
          return "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800";
       case "SELESAIKAN_TINDAKAN":
          return "bg-emerald-100 text-brand-green border-emerald-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800";
       case "BUKA_ULANG_TEMUAN":
          return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800";
       case "BUAT_ARMADA":
          return "bg-emerald-100 text-brand-green border-emerald-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800";
       case "UPDATE_ARMADA":
          return "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800";
       case "VERIFIKASI_ARMADA":
          return "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800";
       case "EDIT_PO":
          return "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800";
       default:
         return "";
   }
}

function summarizeMetadata(metadata: Record<string, unknown>) {
   const entries = Object.entries(metadata ?? {});
   if (entries.length === 0) return "-";

   return entries
      .slice(0, 2)
      .map(([key, value]) => {
         if (value === null || value === undefined || value === "") {
            return `${key}: -`;
         }

         if (typeof value === "object") {
            return `${key}: ${JSON.stringify(value)}`;
         }

         return `${key}: ${String(value)}`;
      })
      .join(" · ");
}

function exportCsv(rows: ActivityLog[]) {
   if (rows.length === 0) return;

   const headers = ["Waktu", "Pengguna", "Aksi", "Deskripsi", "Metadata"];
   const csvRows = rows.map((row) => [
      row.created_at,
      row.user_name,
      formatActionLabel(row.aksi),
      row.deskripsi ?? "",
      JSON.stringify(row.metadata ?? {}),
   ]);

   const csv = [headers, ...csvRows]
      .map((row) =>
         row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");

   const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
   const url = URL.createObjectURL(blob);
   const anchor = document.createElement("a");
   anchor.href = url;
   anchor.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
   anchor.click();
   URL.revokeObjectURL(url);
}

async function fetchActivityLogs(params: {
   startDate: string;
   endDate: string;
   aksi?: AksiLog;
   search?: string;
   limit: number;
   offset?: number;
}) {
   const searchParams = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
      limit: String(params.limit),
   });

   if (params.offset) searchParams.set("offset", String(params.offset));
   if (params.aksi) searchParams.set("aksi", params.aksi);
   if (params.search) searchParams.set("q", params.search);

   const response = await fetch(
      `/api/staf-iw/audit-trail?${searchParams.toString()}`,
      { cache: "no-store" },
   );
   const payload = await response.json().catch(() => null);

   if (!response.ok) {
      throw new Error(payload?.message ?? "Gagal memuat audit trail");
   }

   return {
      data: (payload?.data ?? []) as ActivityLog[],
      hasMore: payload?.hasMore === true,
   };
}

const PAGE_SIZE = 200;

export function AuditTrailPanel() {
   const [startDate, setStartDate] = useState(getDateOffset(6));
   const [endDate, setEndDate] = useState(getDateOffset(0));
   const [aksi, setAksi] = useState<AksiLog | "SEMUA">("SEMUA");
   const [search, setSearch] = useState("");
   const [rows, setRows] = useState<ActivityLog[]>([]);
   const [loading, setLoading] = useState(true);
   const [loadingMore, setLoadingMore] = useState(false);
   const [hasMore, setHasMore] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const deferredSearch = useDeferredValue(search);

   useEffect(() => {
      let mounted = true;

      const load = async () => {
         setLoading(true);
         setError(null);

         try {
            const result = await fetchActivityLogs({
               startDate,
               endDate,
               aksi: aksi === "SEMUA" ? undefined : aksi,
               search: deferredSearch.trim() || undefined,
               limit: PAGE_SIZE,
            });

            if (!mounted) return;
            setRows(result.data);
            setHasMore(result.hasMore);
         } catch (err: unknown) {
            if (!mounted) return;
            setError(getErrorMessage(err));
         } finally {
            if (mounted) setLoading(false);
         }
      };

      load();
      return () => {
         mounted = false;
      };
   }, [startDate, endDate, aksi, deferredSearch]);

   const loadMore = async () => {
      setLoadingMore(true);
      try {
         const result = await fetchActivityLogs({
            startDate,
            endDate,
            aksi: aksi === "SEMUA" ? undefined : aksi,
            search: deferredSearch.trim() || undefined,
            limit: PAGE_SIZE,
            offset: rows.length,
         });
         setRows((prev) => [...prev, ...result.data]);
         setHasMore(result.hasMore);
      } catch {
         setHasMore(false);
      } finally {
         setLoadingMore(false);
      }
   };

   const uniqueUsers = new Set(rows.map((row) => row.user_id)).size;
   const todayKey = new Date().toISOString().slice(0, 10);
   const todayLogs = rows.filter((row) =>
      row.created_at.startsWith(todayKey),
   ).length;
   const findingLogs = rows.filter((row) =>
      ["BUAT_TEMUAN", "UPDATE_TEMUAN", "KIRIM_KLARIFIKASI"].includes(row.aksi),
   ).length;

   return (
      <div className="space-y-5">
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
               title="Total Log"
               value={String(rows.length)}
               description="Aktivitas pada rentang terpilih"
               icon="activity"
               accent="blue"
               index={0}
            />
            <DashboardCard
               title="Pengguna Unik"
               value={String(uniqueUsers)}
               description="Akun yang terekam"
               icon="users"
               accent="violet"
               index={1}
            />
            <DashboardCard
               title="Log Hari Ini"
               value={String(todayLogs)}
               description="Aktivitas tanggal berjalan"
               icon="calendar"
               accent="green"
               index={2}
            />
            <DashboardCard
               title="Temuan & Klarifikasi"
               value={String(findingLogs)}
               description="Aktivitas tindak lanjut temuan"
               icon="file-text"
               accent="amber"
               index={3}
            />
         </div>

         <Card className="border-base-300">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
               <div>
                  <CardTitle className="text-base">
                     Audit Trail Aktivitas Sistem
                  </CardTitle>
                  <p className="text-sm text-base-content/70 mt-1">
                     Pantau jejak aktivitas penting untuk monitoring dan tindak
                     lanjut.
                  </p>
               </div>
                <div className="flex flex-wrap items-center gap-2">
                   <div className="relative w-full sm:w-[220px]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/70" aria-hidden="true" />
                      <input
                         type="search"
                         aria-label="Cari audit trail"
                         value={search}
                         onChange={(event) => setSearch(event.target.value)}
                         placeholder="Cari pengguna/detail"
                         className="h-10 w-full rounded-md border border-base-300 bg-base-100 pl-9 pr-3 text-sm shadow-sm outline-none"
                      />
                  </div>
                  <div className="w-[150px]">
                     <DatePicker value={startDate} onChange={setStartDate} />
                  </div>
                  <div className="w-[150px]">
                     <DatePicker value={endDate} onChange={setEndDate} />
                  </div>
                   <Select
                      value={aksi}
                      onValueChange={(v) => setAksi(v as AksiLog | "SEMUA")}
                   >
                      <SelectTrigger className="w-[180px]">
                         <SelectValue placeholder="Semua Aksi" />
                      </SelectTrigger>
                      <SelectContent>
                         {ACTION_OPTIONS.map((option) => (
                            <SelectItem
                               key={option.value}
                               value={option.value}
                            >
                               {option.label}
                            </SelectItem>
                         ))}
                      </SelectContent>
                   </Select>
                  <Button
                     type="button"
                     variant="outline"
                     onClick={() => exportCsv(rows)}
                     disabled={rows.length === 0}
                  >
                     <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                     CSV
                  </Button>
               </div>
            </CardHeader>
            <CardContent>
               {error && (
                  <div className="mb-4 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-3 py-2 text-sm text-error">
                     {error}
                  </div>
               )}

               <div className="overflow-hidden rounded-lg border border-base-300 bg-base-100">
                  <Table caption="Riwayat audit aktivitas sistem">
                     <TableHeader>
                        <TableRow>
                           <TableHead>Waktu</TableHead>
                           <TableHead>Pengguna</TableHead>
                           <TableHead>Aksi</TableHead>
                           <TableHead>Detail</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                         {loading ? (
                            <TableRow>
                               <TableCell colSpan={4}>
                                  <LoadingState
                                     variant="inline"
                                     text="Memuat audit trail…"
                                  />
                               </TableCell>
                            </TableRow>
                         ) : rows.length === 0 ? (
                           <TableRow>
                              <TableCell
                                 colSpan={4}
                                 className="py-8 text-center text-sm text-base-content/70"
                              >
                                 Tidak ada aktivitas pada filter ini.
                              </TableCell>
                           </TableRow>
                        ) : (
                            rows.map((row) => (
                               <TableRow
                                  key={row.id}
                                  className="[content-visibility:auto] [contain-intrinsic-block-size:64px]"
                               >
                                 <TableCell className="whitespace-nowrap text-sm text-base-content/70">
                                    {formatDateTime(row.created_at)}
                                 </TableCell>
                                  <TableCell className="font-medium text-base-content">
                                    {row.user_name}
                                 </TableCell>
                                 <TableCell>
                                    <Badge
                                       variant="outline"
                                       className={badgeClassForAction(row.aksi)}
                                    >
                                       {formatActionLabel(row.aksi)}
                                    </Badge>
                                 </TableCell>
                                 <TableCell className="text-sm text-base-content/70">
                                    <div className="space-y-1">
                                       <p>{row.deskripsi ?? "-"}</p>
                                       <p className="text-[12px] text-base-content/70">
                                          {summarizeMetadata(row.metadata)}
                                       </p>
                                    </div>
                                 </TableCell>
                              </TableRow>
                           ))
                        )}
                      </TableBody>
                   </Table>
                </div>

               {hasMore && !loading && (
                  <div className="mt-3 flex items-center justify-center">
                     <Button
                        type="button"
                        variant="outline"
                        onClick={loadMore}
                        disabled={loadingMore}
                     >
                        {loadingMore ? (
                           <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                              Memuat…
                           </>
                        ) : (
                           "Muat lebih banyak"
                        )}
                     </Button>
                  </div>
               )}

               {rows.length > 0 && !hasMore && (
                  <p className="mt-2 text-center text-xs text-base-content/70">
                     Menampilkan {rows.length} log
                  </p>
               )}

               {hasMore && !loading && (
                  <p className="mt-1 text-center text-xs text-base-content/70">
                     Menampilkan {rows.length} log terbaru
                  </p>
               )}
             </CardContent>
         </Card>
      </div>
   );
}
