"use client";

import { startTransition, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
   AlertCircle,
   ArrowUpRight,
   CheckCircle2,
   Download,
   FileSpreadsheet,
   Loader2,
   RefreshCw,
   Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const TEMPLATE_CSV = [
   "nomor_polisi,compliance_status,issue_count,source_updated_at,external_ref",
   "B1234CD,compliant,0,2026-06-22,iwkbu:B1234CD",
   "D9876EF,non_compliant,2,2026-06-22,iwkbu:D9876EF",
].join("\n");

type DashboardData = {
   summary: {
      total_rows: number;
      ready: number;
      needs_review: number;
      blocked: number;
      source_records: number;
   };
   runs: Array<{
      id: string;
      trigger_type: string;
      status: string;
      started_at: string;
      finished_at: string | null;
      summary: Record<string, unknown> | null;
      error_message: string | null;
   }>;
    statuses: Array<{
       armada_id: string;
       po_id: string;
       nomor_polisi: string;
       iwkbu_compliance_status: string;
       reconciliation_status: string;
       discrepancy_note: string | null;
       last_synced_at: string;
       terminal_last_seen: string | null;
    }>;
};

export function IwkbuSyncPanel({
   initialData,
}: {
   initialData: DashboardData;
}) {
   const router = useRouter();
   const [syncing, setSyncing] = useState(false);
   const [uploading, setUploading] = useState(false);
   const [uploadFile, setUploadFile] = useState<File | null>(null);
   const [fileInputKey, setFileInputKey] = useState(0);
   const [message, setMessage] = useState<string | null>(null);
   const [error, setError] = useState<string | null>(null);
   const [uploadMessage, setUploadMessage] = useState<string | null>(null);
   const [uploadError, setUploadError] = useState<string | null>(null);

   const latestRun = initialData.runs[0] ?? null;

   const runSync = async () => {
      setSyncing(true);
      setMessage(null);
      setError(null);

      try {
         const response = await fetch("/api/staf-iw/iwkbu-sync", {
            method: "POST",
         });

         const json = await response.json();
         if (!response.ok) {
            throw new Error(json?.message ?? "Gagal menjalankan sinkronisasi");
         }

          setMessage("Sinkronisasi IWKBU selesai dijalankan.");
          startTransition(() => router.refresh());
       } catch (err: unknown) {
          setError(
             err instanceof Error
                ? err.message
                : "Terjadi kesalahan saat sinkronisasi",
          );
       } finally {
          setSyncing(false);
       }
   };

   const uploadSource = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setUploadMessage(null);
      setUploadError(null);

      if (!uploadFile) {
         setUploadError("Pilih file sumber IWKBU terlebih dahulu.");
         return;
      }

      if (uploadFile.size > MAX_UPLOAD_BYTES) {
         setUploadError("Ukuran file maksimal 2 MB.");
         return;
      }

      setUploading(true);

      try {
         const formData = new FormData();
         formData.set("file", uploadFile);

         const response = await fetch("/api/staf-iw/iwkbu-source", {
            method: "POST",
            body: formData,
         });
         const json = await response.json().catch(() => null);

         if (!response.ok) {
            throw new Error(json?.message ?? "Gagal mengunggah sumber IWKBU");
         }

         setUploadMessage(
            `Upload berhasil. ${json?.count ?? 0} record sumber IWKBU tersimpan.`,
         );
         setUploadFile(null);
         setFileInputKey((value) => value + 1);
         startTransition(() => router.refresh());
      } catch (err: unknown) {
         setUploadError(
            err instanceof Error ? err.message : "Gagal mengunggah sumber IWKBU",
         );
      } finally {
         setUploading(false);
      }
   };

   const downloadTemplate = () => {
      const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "template-source-iwkbu.csv";
      anchor.click();
      URL.revokeObjectURL(url);
   };

   return (
      <div className="space-y-6 mt-6">
         <div className="grid gap-4 md:grid-cols-5">
            <Card>
               <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                     Total Armada Tersinkron
                  </CardTitle>
               </CardHeader>
               <CardContent className="text-2xl font-semibold">
                  {initialData.summary.total_rows}
               </CardContent>
            </Card>
            <Card>
               <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                     Ready
                  </CardTitle>
               </CardHeader>
               <CardContent className="text-2xl font-semibold text-brand-green">
                  {initialData.summary.ready}
               </CardContent>
            </Card>
            <Card>
               <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                     Needs Review
                  </CardTitle>
               </CardHeader>
               <CardContent className="text-2xl font-semibold text-accent">
                  {initialData.summary.needs_review}
               </CardContent>
            </Card>
            <Card>
               <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                     Blocked
                  </CardTitle>
               </CardHeader>
               <CardContent className="text-2xl font-semibold text-destructive">
                  {initialData.summary.blocked}
               </CardContent>
            </Card>
            <Card>
               <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                     Record Source IWKBU
                  </CardTitle>
               </CardHeader>
               <CardContent className="text-2xl font-semibold">
                  {initialData.summary.source_records}
               </CardContent>
            </Card>
         </div>

          <Card>
             <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                   <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      Upload Source IWKBU
                   </CardTitle>
                   <p className="mt-1 text-sm text-muted-foreground">
                      Terima CSV atau JSON. Kolom minimal: nomor_polisi. Kolom
                      opsional: compliance_status, issue_count,
                      source_updated_at, external_ref.
                   </p>
                </div>
                <Button type="button" variant="outline" onClick={downloadTemplate}>
                   <Download className="mr-2 h-4 w-4" />
                   Template CSV
                </Button>
             </CardHeader>
             <CardContent className="space-y-4">
                <form
                   onSubmit={uploadSource}
                   className="flex flex-col gap-3 lg:flex-row lg:items-center"
                >
                   <input
                      key={fileInputKey}
                      type="file"
                      accept=".csv,.json,text/csv,application/json"
                      onChange={(event) => {
                         setUploadFile(event.target.files?.[0] ?? null);
                         setUploadMessage(null);
                         setUploadError(null);
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted lg:max-w-xl"
                   />
                   <Button type="submit" disabled={uploading || !uploadFile}>
                      {uploading ? (
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                         <Upload className="mr-2 h-4 w-4" />
                      )}
                      Upload Source
                   </Button>
                </form>

                <div className="text-xs text-muted-foreground">
                   Batas upload: 2 MB atau maksimal 5.000 baris per file. Status
                   valid: compliant, non_compliant, pending, unknown.
                   {uploadFile ? (
                      <span className="ml-1 font-medium text-foreground">
                         Dipilih: {uploadFile.name} (
                         {(uploadFile.size / 1024).toFixed(1)} KB)
                      </span>
                   ) : null}
                </div>

                {uploadMessage && (
                   <Alert className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>{uploadMessage}</AlertDescription>
                   </Alert>
                )}

                {uploadError && (
                   <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{uploadError}</AlertDescription>
                   </Alert>
                )}
             </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
               <CardTitle>Status Sinkronisasi</CardTitle>
               <Button onClick={runSync} disabled={syncing}>
                  {syncing ? (
                     <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                     <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Jalankan Sinkronisasi
               </Button>
            </CardHeader>
            <CardContent className="space-y-3">
               {latestRun ? (
                  <div className="text-sm text-muted-foreground">
                     Run terakhir:{" "}
                     {new Date(latestRun.started_at).toLocaleString("id-ID")} (
                     {latestRun.trigger_type})
                  </div>
               ) : (
                  <div className="text-sm text-muted-foreground">
                     Belum ada run sinkronisasi.
                  </div>
               )}

               {message && (
                  <Alert className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300">
                     <CheckCircle2 className="h-4 w-4" />
                     <AlertDescription>{message}</AlertDescription>
                  </Alert>
               )}

               {error && (
                  <Alert variant="destructive">
                     <AlertCircle className="h-4 w-4" />
                     <AlertDescription>{error}</AlertDescription>
                  </Alert>
               )}
            </CardContent>
         </Card>

         <Card>
            <CardHeader>
               <CardTitle>Riwayat Run Sinkronisasi</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-2">
                  {initialData.runs.length === 0 ? (
                     <p className="text-sm text-muted-foreground">
                        Belum ada riwayat sinkronisasi.
                     </p>
                  ) : (
                     initialData.runs.slice(0, 10).map((run) => (
                        <div
                           key={run.id}
                           className="flex items-center justify-between border rounded-md px-3 py-2"
                        >
                           <div>
                              <p className="text-sm font-medium">
                                 {new Date(run.started_at).toLocaleString(
                                    "id-ID",
                                 )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                 Trigger: {run.trigger_type}
                              </p>
                           </div>
                           <Badge
                              variant={
                                 run.status === "success"
                                    ? "default"
                                    : run.status === "failed"
                                      ? "destructive"
                                      : "secondary"
                              }
                           >
                              {run.status}
                           </Badge>
                        </div>
                     ))
                  )}
               </div>
            </CardContent>
         </Card>

         <Card>
            <CardHeader>
               <CardTitle>Snapshot Rekonsiliasi IWKBU</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                      <thead>
                         <tr className="border-b text-left">
                            <th className="py-2 pr-4">Nomor Polisi</th>
                            <th className="py-2 pr-4">Status IWKBU</th>
                            <th className="py-2 pr-4">Status Rekonsiliasi</th>
                            <th className="py-2 pr-4">Catatan</th>
                            <th className="py-2 pr-4">Last Sync</th>
                            <th className="py-2 pr-4">Aksi</th>
                         </tr>
                      </thead>
                     <tbody>
                         {initialData.statuses.length === 0 ? (
                            <tr>
                               <td
                                  colSpan={6}
                                  className="py-4 text-muted-foreground"
                               >
                                  Belum ada data sinkronisasi.
                               </td>
                            </tr>
                         ) : (
                            initialData.statuses.slice(0, 100).map((row) => (
                               <tr
                                  key={row.armada_id}
                                  className="border-b align-top"
                               >
                                  <td className="py-2 pr-4 font-medium">
                                     {row.nomor_polisi}
                                  </td>
                                  <td className="py-2 pr-4">
                                     {row.iwkbu_compliance_status}
                                  </td>
                                  <td className="py-2 pr-4">
                                     <Badge
                                        variant={
                                           row.reconciliation_status === "ready"
                                              ? "default"
                                              : row.reconciliation_status ===
                                                  "blocked"
                                                ? "destructive"
                                                : "secondary"
                                        }
                                     >
                                        {row.reconciliation_status}
                                     </Badge>
                                  </td>
                                  <td className="py-2 pr-4 text-muted-foreground">
                                     {row.discrepancy_note ?? "-"}
                                  </td>
                                  <td className="py-2 pr-4 text-muted-foreground">
                                     {new Date(
                                        row.last_synced_at,
                                     ).toLocaleString("id-ID")}
                                  </td>
                                  <td className="py-2 pr-4">
                                     {row.reconciliation_status !== "ready" && (
                                        <button
                                           className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground hover:bg-muted/50"
                                           onClick={() =>
                                              router.push(
                                                 `/staf-iw/temuan?poId=${encodeURIComponent(row.po_id)}&armadaId=${encodeURIComponent(row.armada_id)}&nomorPolisi=${encodeURIComponent(row.nomor_polisi)}&judul=${encodeURIComponent(`Diskrepansi IWKBU: ${row.nomor_polisi}`)}&deskripsi=${encodeURIComponent(row.discrepancy_note ?? `Status: ${row.reconciliation_status}, IWKBU: ${row.iwkbu_compliance_status}`)}`,
                                              )
                                           }
                                        >
                                           <ArrowUpRight className="h-3 w-3" />
                                           Buat Temuan
                                        </button>
                                     )}
                                  </td>
                               </tr>
                            ))
                         )}
                     </tbody>
                  </table>
               </div>
            </CardContent>
         </Card>
      </div>
   );
}
