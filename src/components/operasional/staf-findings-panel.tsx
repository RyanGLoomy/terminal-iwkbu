"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { StatusBadge, STATUS_MAP } from "@/components/shared/status-badge";
import type {
   FindingRecord,
   FindingStatus,
} from "@/lib/supabase/queries/operasional.types";
import { toast } from "sonner";
import { AlertCircle, MessageSquare, Pencil } from "lucide-react";
import { getErrorMessage } from "@/lib/db-error";
import {
   FINDINGS_PAGE_SIZE,
   formatDateTime,
   isOverdue,
} from "./findings-shared";
import { StafFindingsStatusDialog } from "./staf-findings-status-dialog";
import { StafFindingsClarificationDialog } from "./staf-findings-clarification-dialog";
import { StafFindingsEditDialog } from "./staf-findings-edit-dialog";

type Option = { id: string; label: string };

export function StafFindingsPanel({
   initialFindings,
   poOptions,
   armadaOptions,
   prefill,
}: {
   initialFindings: FindingRecord[];
   poOptions: Option[];
   armadaOptions: Option[];
   prefill?: {
      poId?: string;
      armadaId?: string;
      nomorPolisi?: string;
      judul?: string;
      deskripsi?: string;
   };
}) {
   const router = useRouter();
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [statusDialog, setStatusDialog] = useState<{
      finding: FindingRecord | null;
      targetStatus: FindingStatus;
   }>({ finding: null, targetStatus: "open" });
   const [clarificationFinding, setClarificationFinding] =
      useState<FindingRecord | null>(null);
   const [editFinding, setEditFinding] = useState<FindingRecord | null>(null);
   const [form, setForm] = useState({
      poId: prefill?.poId ?? poOptions[0]?.id ?? "",
      armadaId: prefill?.armadaId ?? armadaOptions[0]?.id ?? "",
      nomorPolisi: prefill?.nomorPolisi ?? "",
      sourceType: "rekonsiliasi",
      judul: prefill?.judul ?? "",
      deskripsi: prefill?.deskripsi ?? "",
       severity: "medium",
       sourceDate: "",
       dueDate: "",
    });

    useEffect(() => {
       setForm((prev) => ({
          ...prev,
          sourceDate: new Date().toISOString().slice(0, 10),
       }));
    }, []);

   const stats = {
      open: initialFindings.filter((item) => item.status === "open").length,
      progress: initialFindings.filter(
         (item) => item.status === "on_progress",
      ).length,
      closed: initialFindings.filter((item) => item.status === "closed")
         .length,
      total: initialFindings.length,
   };

   const [search, setSearch] = useState("");
   const deferredSearch = useDeferredValue(search);
   const [visibleCount, setVisibleCount] = useState(FINDINGS_PAGE_SIZE);
   const filteredFindings = (() => {
      if (!deferredSearch.trim()) return initialFindings;
      const q = deferredSearch.trim().toLowerCase();
      return initialFindings.filter(
         (f) =>
            f.judul.toLowerCase().includes(q) ||
            f.nomor_polisi.toLowerCase().includes(q) ||
            (f.po?.kode_po ?? "").toLowerCase().includes(q) ||
            (f.po?.nama_perusahaan ?? "").toLowerCase().includes(q) ||
            (f.deskripsi ?? "").toLowerCase().includes(q),
      );
   })();

   const visibleFindings = filteredFindings.slice(0, visibleCount);

   const submitFinding = async () => {
      setLoading(true);
      setError(null);

      try {
         const response = await fetch("/api/staf-iw/findings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });

         const payload = await response.json();
         if (!response.ok) {
            throw new Error(payload.message ?? "Gagal membuat temuan");
         }

         toast.success("Temuan berhasil dibuat");
         setForm({
            poId: poOptions[0]?.id ?? "",
            armadaId: armadaOptions[0]?.id ?? "",
            nomorPolisi: "",
            sourceType: "rekonsiliasi",
            judul: "",
            deskripsi: "",
            severity: "medium",
            sourceDate: new Date().toISOString().slice(0, 10),
            dueDate: "",
         });
         router.refresh();
      } catch (err: unknown) {
         setError(getErrorMessage(err));
      } finally {
         setLoading(false);
      }
   };

   const reopenFinding = async (findingId: string) => {
      try {
         const response = await fetch(`/api/staf-iw/findings/${findingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "open" }),
         });

         const payload = await response.json();
         if (!response.ok) {
            throw new Error(payload.message ?? "Gagal membuka ulang temuan");
         }

         toast.success("Temuan dibuka kembali");
         router.refresh();
      } catch (err: unknown) {
         toast.error(getErrorMessage(err));
      }
   };

   return (
      <div className="space-y-5">
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
               title="Total Temuan"
               value={String(stats.total)}
               description="Catatan yang tersimpan"
               icon="alert-triangle"
               accent="blue"
               index={0}
            />
            <DashboardCard
               title="Open"
               value={String(stats.open)}
               description="Menunggu tindak lanjut"
               icon="clock"
               accent="amber"
               index={1}
            />
            <DashboardCard
               title="On Progress"
               value={String(stats.progress)}
               description="Sedang diklarifikasi"
               icon="activity"
               accent="violet"
               index={2}
            />
            <DashboardCard
               title="Closed"
               value={String(stats.closed)}
               description="Sudah diselesaikan"
               icon="check-circle"
               accent="green"
               index={3}
            />
         </div>

         <Card className="border-base-300">
            <CardHeader>
               <CardTitle className="text-base">Buat Temuan Baru</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {error && (
                  <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-3 py-2 text-sm text-error">
                     <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                     <span>{error}</span>
                  </div>
               )}

               <div className="grid gap-4 lg:grid-cols-2">
                  <label className="space-y-2 text-sm">
                     <span className="font-medium text-base-content">PO</span>
                     <Select
                        value={form.poId}
                        onValueChange={(v) =>
                           setForm((current) => ({
                              ...current,
                              poId: v,
                           }))
                        }
                     >
                        <SelectTrigger className="h-10 w-full rounded-md border border-base-300 bg-base-100 px-3">
                           <SelectValue placeholder="Pilih PO" />
                        </SelectTrigger>
                        <SelectContent>
                           {poOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                 {option.label}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </label>

                  <label className="space-y-2 text-sm">
                     <span className="font-medium text-base-content">Armada</span>
                     <Select
                        value={form.armadaId}
                        onValueChange={(v) =>
                           setForm((current) => ({
                              ...current,
                              armadaId: v,
                           }))
                        }
                     >
                        <SelectTrigger className="h-10 w-full rounded-md border border-base-300 bg-base-100 px-3">
                           <SelectValue placeholder="Pilih Armada" />
                        </SelectTrigger>
                        <SelectContent>
                           {armadaOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                 {option.label}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </label>

                  <label className="space-y-2 text-sm">
                     <span className="font-medium text-base-content">Nomor Polisi</span>
                     <Input
                        value={form.nomorPolisi}
                        onChange={(e) =>
                           setForm((current) => ({
                              ...current,
                              nomorPolisi: e.target.value,
                           }))
                        }
                        placeholder="B1234XYZ"
                     />
                  </label>

                  <label className="space-y-2 text-sm">
                     <span className="font-medium text-base-content">Severity</span>
                     <Select
                        value={form.severity}
                        onValueChange={(v) =>
                           setForm((current) => ({
                              ...current,
                              severity: v,
                           }))
                        }
                     >
                        <SelectTrigger className="h-10 w-full rounded-md border border-base-300 bg-base-100 px-3">
                           <SelectValue placeholder="Pilih Severity" />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="low">Rendah</SelectItem>
                           <SelectItem value="medium">Sedang</SelectItem>
                           <SelectItem value="high">Tinggi</SelectItem>
                        </SelectContent>
                     </Select>
                  </label>

                  <label className="space-y-2 text-sm">
                     <span className="font-medium text-base-content">Tanggal Sumber</span>
                     <Input
                        type="date"
                        value={form.sourceDate}
                        onChange={(e) =>
                           setForm((current) => ({
                              ...current,
                              sourceDate: e.target.value,
                           }))
                        }
                     />
                  </label>

                  <label className="space-y-2 text-sm">
                     <span className="font-medium text-base-content">Tenggat Waktu</span>
                     <Input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) =>
                           setForm((current) => ({
                              ...current,
                              dueDate: e.target.value,
                           }))
                        }
                     />
                  </label>

                  <label className="space-y-2 text-sm">
                     <span className="font-medium text-base-content">Judul</span>
                     <Input
                        value={form.judul}
                        onChange={(e) =>
                           setForm((current) => ({
                              ...current,
                              judul: e.target.value,
                           }))
                        }
                        placeholder="Judul temuan"
                     />
                  </label>

                  <label className="space-y-2 text-sm lg:col-span-2">
                     <span className="font-medium text-base-content">Deskripsi</span>
                     <Textarea
                        value={form.deskripsi}
                        onChange={(e) =>
                           setForm((current) => ({
                              ...current,
                              deskripsi: e.target.value,
                           }))
                        }
                        placeholder="Jelaskan temuan secara singkat"
                        rows={4}
                     />
                  </label>

                  <div className="lg:col-span-2 flex items-end justify-end">
                     <Button onClick={submitFinding} disabled={loading}>
                        {loading ? "Membuat…" : "Buat Temuan"}
                     </Button>
                  </div>
               </div>

               <div className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-base-content">
                     Daftar Temuan ({filteredFindings.length}
                     {filteredFindings.length !== initialFindings.length &&
                        ` dari ${initialFindings.length}`})
                  </span>
                  <div className="flex items-center gap-2">
                     <Input
                        placeholder="Cari temuan..."
                        value={search}
                        onChange={(e) => {
                           setSearch(e.target.value);
                           setVisibleCount(FINDINGS_PAGE_SIZE);
                        }}
                        className="h-8 w-48 text-sm"
                     />
                     <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                           if (filteredFindings.length === 0) return;

                           const headers = [
                              "Waktu",
                              "Kode PO",
                              "Nama PO",
                              "Nomor Polisi",
                              "Judul",
                              "Status",
                              "Catatan",
                              "Klarifikasi",
                           ];
                           const csvRows = filteredFindings.map((f) => [
                              f.created_at,
                              f.po?.kode_po ?? f.po_id,
                              f.po?.nama_perusahaan ?? "",
                              f.nomor_polisi,
                              f.judul,
                              STATUS_MAP.finding[f.status]?.label ?? f.status,
                              f.resolution_note ?? "",
                              String(f.finding_clarifications?.length ?? 0),
                           ]);

                           const csv = [headers, ...csvRows]
                              .map((row) =>
                                 row.map((cell) => `"${cell}"`).join(","),
                              )
                              .join("\n");

                           const blob = new Blob([csv], {
                              type: "text/csv;charset=utf-8;",
                           });
                           const url = URL.createObjectURL(blob);
                           const a = document.createElement("a");
                           a.href = url;
                           a.download = `temuan-staf-iw.csv`;
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
                           if (filteredFindings.length === 0) return;
                           try {
                              const { jsPDF } = await import("jspdf");
                              const autoTable = (await import("jspdf-autotable")).default;

                              const doc = new jsPDF({ orientation: "landscape" });

                              const headers = [
                                 "Waktu",
                                 "PO",
                                 "Nomor Polisi",
                                 "Judul",
                                 "Status",
                                 "Catatan",
                              ];

                              const body = filteredFindings.map((f) => [
                                 f.created_at
                                    ? new Date(f.created_at).toLocaleString("id-ID", {
                                         dateStyle: "medium",
                                         timeStyle: "short",
                                      })
                                    : "-",
                                 f.po?.kode_po ?? f.po_id,
                                 f.nomor_polisi,
                                 f.judul,
                                 f.status === "open"
                                    ? "Open"
                                    : f.status === "on_progress"
                                      ? "On Progress"
                                      : "Closed",
                                 f.resolution_note ?? "-",
                              ]);

                              // @ts-ignore - jsPDF autotable typings may not be available
                              autoTable(doc, {
                                 head: [headers],
                                 body,
                                 startY: 10,
                              });

                              doc.save("temuan-staf-iw.pdf");
                           } catch {
                           }
                        }}
                     >
                        PDF
                     </Button>
                  </div>
               </div>
               <div className="overflow-hidden rounded-lg border border-base-300 bg-base-100">
                  <Table caption="Daftar temuan Staf IW">
                     <TableHeader>
                        <TableRow>
                           <TableHead>Waktu</TableHead>
                           <TableHead>PO</TableHead>
                           <TableHead>Judul</TableHead>
                           <TableHead>Severity</TableHead>
                           <TableHead>Status</TableHead>
                           <TableHead>Catatan</TableHead>
                           <TableHead>Klarifikasi</TableHead>
                           <TableHead>Aksi</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {filteredFindings.length === 0 ? (
                           <TableRow>
                              <TableCell
                                 colSpan={8}
                                 className="py-8 text-center text-sm text-base-content/70"
                              >
                                 {initialFindings.length === 0
                                    ? "Belum ada temuan."
                                    : "Tidak ada temuan yang cocok dengan pencarian."}
                              </TableCell>
                           </TableRow>
                        ) : (
                           visibleFindings.map((finding) => (
                              <TableRow key={finding.id}>
                                 <TableCell className="whitespace-nowrap text-sm text-base-content/70">
                                    {formatDateTime(finding.created_at)}
                                 </TableCell>
                                 <TableCell>
                                    <div className="font-medium text-base-content">
                                       {finding.po?.kode_po ?? finding.po_id}
                                    </div>
                                    <div className="text-xs text-base-content/70">
                                       {finding.po?.nama_perusahaan ?? "-"}
                                    </div>
                                 </TableCell>
                                 <TableCell>
                                    <div className="font-medium text-base-content">
                                       {finding.judul}
                                    </div>
                                    <div className="text-xs text-base-content/70">
                                       {finding.nomor_polisi}
                                    </div>
                                 </TableCell>
                                 <TableCell>
                                    <StatusBadge category="severity" value={finding.severity} />
                                 </TableCell>
                                 <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                       <StatusBadge category="finding" value={finding.status} />
                                       {isOverdue(finding.due_date, finding.status) && (
                                          <Badge
                                             variant="outline"
                                             className="bg-red-100 text-error border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800"
                                          >
                                             Terlambat
                                          </Badge>
                                       )}
                                    </div>
                                    {finding.due_date && (
                                       <div className="mt-1 text-xs text-base-content/70">
                                          Tenggat:{" "}
                                          {new Date(finding.due_date).toLocaleDateString("id-ID", {
                                             dateStyle: "medium",
                                          })}
                                       </div>
                                    )}
                                 </TableCell>
                                 <TableCell className="text-sm text-base-content/70">
                                    <div className="max-w-[260px] whitespace-pre-wrap">
                                       {finding.resolution_note ?? "-"}
                                    </div>
                                 </TableCell>
                                 <TableCell className="text-sm text-base-content/70">
                                    <Button
                                       size="sm"
                                       variant="ghost"
                                       className="h-7 px-2"
                                       onClick={() =>
                                          setClarificationFinding(finding)
                                       }
                                    >
                                       <MessageSquare className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                       {finding.finding_clarifications?.length ??
                                          0}
                                    </Button>
                                 </TableCell>
                                 <TableCell>
                                    <div className="flex flex-wrap gap-2">
                                       {finding.status !== "closed" && (
                                          <Button
                                             size="sm"
                                             variant="ghost"
                                             className="h-7 px-2"
                                             onClick={() => setEditFinding(finding)}
                                          >
                                             <Pencil className="h-3.5 w-3.5" />
                                          </Button>
                                       )}
                                       {finding.status !== "closed" && (
                                          <>
                                             <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                   setStatusDialog({
                                                      finding,
                                                      targetStatus: "on_progress",
                                                   })
                                                }
                                             >
                                                On Progress
                                             </Button>
                                             <Button
                                                size="sm"
                                                onClick={() =>
                                                   setStatusDialog({
                                                      finding,
                                                      targetStatus: "closed",
                                                   })
                                                }
                                             >
                                                Close
                                             </Button>
                                          </>
                                       )}
                                       {finding.status === "closed" && (
                                          <Button
                                             size="sm"
                                             variant="outline"
                                             onClick={() =>
                                                reopenFinding(finding.id)
                                             }
                                          >
                                             Buka Ulang
                                          </Button>
                                       )}
                                    </div>
                                 </TableCell>
                              </TableRow>
                           ))
                        )}
                     </TableBody>
                  </Table>
               </div>
               {visibleCount < filteredFindings.length && (
                  <div className="flex justify-center pt-3">
                     <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVisibleCount((c) => c + FINDINGS_PAGE_SIZE)}
                     >
                        Tampilkan Lebih Banyak ({filteredFindings.length - visibleCount} lagi)
                     </Button>
                  </div>
               )}
            </CardContent>
         </Card>

         <StafFindingsStatusDialog
            open={!!statusDialog.finding}
            finding={statusDialog.finding}
            targetStatus={statusDialog.targetStatus}
            onClose={() =>
               setStatusDialog({ finding: null, targetStatus: "open" })
            }
            onChanged={() => router.refresh()}
         />

         <StafFindingsClarificationDialog
            open={!!clarificationFinding}
            finding={clarificationFinding}
            onClose={() => setClarificationFinding(null)}
            onChanged={() => router.refresh()}
         />

         <StafFindingsEditDialog
            open={!!editFinding}
            finding={editFinding}
            onClose={() => setEditFinding(null)}
            onChanged={() => router.refresh()}
         />
      </div>
   );
}
