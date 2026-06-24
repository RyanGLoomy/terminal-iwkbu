"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
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
import type {
   FindingRecord,
   FindingStatus,
   FindingSeverity,
} from "@/lib/supabase/queries/operasional.types";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Circle, Loader2, MessageSquare, Pencil, Plus, Paperclip } from "lucide-react";

function severityClass(severity: FindingSeverity) {
   if (severity === "high")
      return "bg-red-100 text-destructive border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800";
   if (severity === "medium")
      return "bg-amber-100 text-accent border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
   return "bg-muted text-muted-foreground border-border";
}

function severityLabel(severity: FindingSeverity) {
   if (severity === "high") return "Tinggi";
   if (severity === "medium") return "Sedang";
   return "Rendah";
}

function formatDecisionLabel(decision: string) {
   if (decision === "menerima") return "Menerima";
   if (decision === "menolak") return "Menolak";
   if (decision === "melengkapi") return "Melengkapi Bukti";
   return decision;
}

function isOverdue(dueDate: string | null, status: string) {
   if (!dueDate || status === "closed") return false;
   return new Date(dueDate) < new Date(new Date().toDateString());
}

type Option = { id: string; label: string };

const FINDINGS_PAGE_SIZE = 15;

async function downloadEvidence(filePath: string) {
   try {
      const res = await fetch(
         `/api/findings/evidence?path=${encodeURIComponent(filePath)}`,
      );
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
   } catch {
      toast.error("Gagal mengunduh file");
   }
}

function statusClass(status: FindingRecord["status"]) {
   if (status === "closed") {
      return "bg-emerald-100 text-brand-green border-emerald-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800";
   }
   if (status === "on_progress") {
      return "bg-amber-100 text-accent border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
   }
   return "bg-muted text-foreground border-border";
}

function formatDateTime(value: string | null) {
   if (!value) return "-";
   return new Date(value).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
   });
}

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
   const [statusSaving, setStatusSaving] = useState(false);
   const [selectedFinding, setSelectedFinding] = useState<{
      id: string;
      status: FindingStatus;
      judul: string;
      nomorPolisi: string;
   } | null>(null);
   const [resolutionNote, setResolutionNote] = useState("");
   const [clarificationFinding, setClarificationFinding] =
      useState<FindingRecord | null>(null);
   const [clarificationSaving, setClarificationSaving] = useState(false);
   const [clarificationDecision, setClarificationDecision] =
      useState("melengkapi");
   const [clarificationMessage, setClarificationMessage] = useState("");
    const [clarificationEvidenceLink, setClarificationEvidenceLink] =
       useState("");
    const [clarificationFile, setClarificationFile] = useState<File | null>(null);
    const [actionText, setActionText] = useState("");
    const [actionSaving, setActionSaving] = useState(false);
    const [editFinding, setEditFinding] = useState<FindingRecord | null>(null);
    const [editForm, setEditForm] = useState({ judul: "", deskripsi: "", severity: "medium", dueDate: "" });
    const [editSaving, setEditSaving] = useState(false);
    const [form, setForm] = useState({
       poId: prefill?.poId ?? poOptions[0]?.id ?? "",
       armadaId: prefill?.armadaId ?? armadaOptions[0]?.id ?? "",
       nomorPolisi: prefill?.nomorPolisi ?? "",
       sourceType: "rekonsiliasi",
       judul: prefill?.judul ?? "",
       deskripsi: prefill?.deskripsi ?? "",
       severity: "medium",
       sourceDate: new Date().toISOString().slice(0, 10),
       dueDate: "",
    });

   const stats = useMemo(
      () => ({
         open: initialFindings.filter((item) => item.status === "open").length,
         progress: initialFindings.filter(
            (item) => item.status === "on_progress",
         ).length,
         closed: initialFindings.filter((item) => item.status === "closed")
            .length,
         total: initialFindings.length,
      }),
      [initialFindings],
   );

    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [visibleCount, setVisibleCount] = useState(FINDINGS_PAGE_SIZE);
    const filteredFindings = useMemo(() => {
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
    }, [initialFindings, deferredSearch]);

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
       } catch (err: any) {
         setError(err?.message ?? "Gagal membuat temuan");
      } finally {
         setLoading(false);
      }
   };

   const updateStatus = async (
      findingId: string,
      status: FindingStatus,
      note: string,
   ) => {
      const response = await fetch(`/api/staf-iw/findings/${findingId}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            status,
            resolutionNote: note.trim() || undefined,
         }),
      });

      const payload = await response.json();
      if (!response.ok) {
         throw new Error(payload.message ?? "Gagal memperbarui temuan");
      }

      toast.success("Status temuan berhasil diperbarui");
      router.refresh();
   };

   const openStatusDialog = (finding: FindingRecord, status: FindingStatus) => {
      setSelectedFinding({
         id: finding.id,
         status,
         judul: finding.judul,
         nomorPolisi: finding.nomor_polisi,
      });
      setResolutionNote(finding.resolution_note ?? "");
      setError(null);
   };

    const closeStatusDialog = () => {
       setSelectedFinding(null);
       setResolutionNote("");
    };

   const openClarificationDialog = (finding: FindingRecord) => {
      setClarificationFinding(finding);
      setClarificationDecision("melengkapi");
      setClarificationMessage("");
      setClarificationEvidenceLink("");
      setError(null);
   };

    const closeClarificationDialog = () => {
       setClarificationFinding(null);
       setClarificationMessage("");
       setClarificationEvidenceLink("");
       setClarificationFile(null);
    };

    const openEditDialog = (finding: FindingRecord) => {
       setEditFinding(finding);
       setEditForm({
          judul: finding.judul,
          deskripsi: finding.deskripsi ?? "",
          severity: finding.severity,
          dueDate: finding.due_date ?? "",
       });
       setError(null);
    };

    const closeEditDialog = () => {
       setEditFinding(null);
    };

    const submitEdit = async () => {
       if (!editFinding) return;
       if (!editForm.judul.trim()) {
          setError("Judul wajib diisi");
          return;
       }

       setEditSaving(true);
       setError(null);

       try {
          const response = await fetch(`/api/staf-iw/findings/${editFinding.id}`, {
             method: "PATCH",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
                judul: editForm.judul.trim(),
                deskripsi: editForm.deskripsi.trim(),
                severity: editForm.severity,
                dueDate: editForm.dueDate || null,
             }),
          });

          const payload = await response.json();
          if (!response.ok) {
             throw new Error(payload.message ?? "Gagal memperbarui temuan");
          }

          toast.success("Temuan berhasil diperbarui");
          closeEditDialog();
          router.refresh();
       } catch (err: any) {
          setError(err?.message ?? "Gagal memperbarui temuan");
       } finally {
          setEditSaving(false);
       }
    };

   const submitClarification = async () => {
      if (!clarificationFinding) return;
      if (!clarificationMessage.trim()) {
         setError("Pesan klarifikasi wajib diisi");
         return;
      }

      setClarificationSaving(true);
      setError(null);

       try {
          const formData = new FormData();
          formData.append("decision", clarificationDecision);
          formData.append("message", clarificationMessage);
          if (clarificationEvidenceLink)
             formData.append("evidenceLink", clarificationEvidenceLink);
          if (clarificationFile)
             formData.append("evidenceFile", clarificationFile);

          const response = await fetch(
             `/api/staf-iw/findings/${clarificationFinding.id}/clarifications`,
             {
                method: "POST",
                body: formData,
             },
          );

         const payload = await response.json();
         if (!response.ok) {
            throw new Error(
               payload.message ?? "Gagal mengirim klarifikasi",
            );
         }

         toast.success("Klarifikasi berhasil dikirim");
         closeClarificationDialog();
         router.refresh();
      } catch (err: any) {
         setError(err?.message ?? "Gagal mengirim klarifikasi");
      } finally {
         setClarificationSaving(false);
       }
   };

   const addAction = async () => {
      if (!clarificationFinding) return;
      if (!actionText.trim()) return;

      setActionSaving(true);
      setError(null);

      try {
         const response = await fetch(
            `/api/staf-iw/findings/${clarificationFinding.id}/actions`,
            {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ actionText: actionText.trim() }),
            },
         );

         const payload = await response.json();
         if (!response.ok) {
            throw new Error(payload.message ?? "Gagal menambah tindakan");
         }

         setActionText("");
         toast.success("Tindakan berhasil ditambahkan");
         router.refresh();
      } catch (err: any) {
         setError(err?.message ?? "Gagal menambah tindakan");
      } finally {
         setActionSaving(false);
      }
   };

   const toggleAction = async (
      findingId: string,
      actionId: string,
      currentStatus: string,
   ) => {
      const newStatus = currentStatus === "done" ? "open" : "done";

      try {
         const response = await fetch(
            `/api/staf-iw/findings/${findingId}/actions/${actionId}`,
            {
               method: "PATCH",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ status: newStatus }),
            },
         );

         const payload = await response.json();
         if (!response.ok) {
            throw new Error(payload.message ?? "Gagal mengubah status tindakan");
         }

         toast.success(
            newStatus === "done"
               ? "Tindakan ditandai selesai"
               : "Tindakan dibuka kembali",
         );
         router.refresh();
      } catch (err: any) {
         toast.error(err?.message ?? "Gagal mengubah status tindakan");
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
      } catch (err: any) {
         toast.error(err?.message ?? "Gagal membuka ulang temuan");
      }
   };

   const submitStatusUpdate = async () => {
      if (!selectedFinding) return;

      if (selectedFinding.status === "closed" && !resolutionNote.trim()) {
         setError("Catatan penyelesaian wajib diisi saat menutup temuan");
         return;
      }

      setStatusSaving(true);
      setError(null);

      try {
         await updateStatus(
            selectedFinding.id,
            selectedFinding.status,
            resolutionNote,
         );
         closeStatusDialog();
         router.refresh();
      } catch (err: any) {
         setError(err?.message ?? "Gagal memperbarui temuan");
      } finally {
         setStatusSaving(false);
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

         <Card className="border-border">
            <CardHeader>
               <CardTitle className="text-base">Buat Temuan Baru</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {error && (
                  <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-3 py-2 text-sm text-destructive">
                     <AlertCircle className="mt-0.5 h-4 w-4" />
                     <span>{error}</span>
                  </div>
               )}

               <div className="grid gap-4 lg:grid-cols-2">
                  <label className="space-y-2 text-sm">
                     <span className="font-medium text-foreground">PO</span>
                      <Select
                         value={form.poId}
                         onValueChange={(v) =>
                            setForm((current) => ({
                               ...current,
                               poId: v,
                            }))
                         }
                      >
                         <SelectTrigger className="h-10 w-full rounded-md border border-input bg-background px-3">
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
                     <span className="font-medium text-foreground">Armada</span>
                      <Select
                         value={form.armadaId}
                         onValueChange={(v) =>
                            setForm((current) => ({
                               ...current,
                               armadaId: v,
                            }))
                         }
                      >
                         <SelectTrigger className="h-10 w-full rounded-md border border-input bg-background px-3">
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
                     <span className="font-medium text-foreground">Nomor Polisi</span>
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
                     <span className="font-medium text-foreground">Severity</span>
                      <Select
                         value={form.severity}
                         onValueChange={(v) =>
                            setForm((current) => ({
                               ...current,
                               severity: v,
                            }))
                         }
                      >
                         <SelectTrigger className="h-10 w-full rounded-md border border-input bg-background px-3">
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
                      <span className="font-medium text-foreground">Tanggal Sumber</span>
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
                      <span className="font-medium text-foreground">Tenggat Waktu</span>
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
                     <span className="font-medium text-foreground">Judul</span>
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
                     <span className="font-medium text-foreground">Deskripsi</span>
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
                        {loading ? "Membuat..." : "Buat Temuan"}
                     </Button>
                  </div>
               </div>

               <div className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-foreground">
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
                              f.status === "open"
                                 ? "Open"
                                 : f.status === "on_progress"
                                   ? "On Progress"
                                   : "Closed",
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
               <div className="overflow-hidden rounded-lg border border-border bg-card">
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
                                   className="py-8 text-center text-sm text-muted-foreground"
                                >
                                  {initialFindings.length === 0
                                     ? "Belum ada temuan."
                                     : "Tidak ada temuan yang cocok dengan pencarian."}
                               </TableCell>
                           </TableRow>
                        ) : (
                            visibleFindings.map((finding) => (
                              <TableRow key={finding.id}>
                                 <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                    {formatDateTime(finding.created_at)}
                                 </TableCell>
                                 <TableCell>
                                     <div className="font-medium text-foreground">
                                       {finding.po?.kode_po ?? finding.po_id}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                       {finding.po?.nama_perusahaan ?? "-"}
                                    </div>
                                 </TableCell>
                                  <TableCell>
                                      <div className="font-medium text-foreground">
                                        {finding.judul}
                                     </div>
                                     <div className="text-xs text-muted-foreground">
                                        {finding.nomor_polisi}
                                     </div>
                                  </TableCell>
                                  <TableCell>
                                     <Badge
                                        variant="outline"
                                        className={severityClass(finding.severity)}
                                     >
                                        {severityLabel(finding.severity)}
                                     </Badge>
                                  </TableCell>
                                  <TableCell>
                                     <div className="flex flex-wrap gap-1">
                                        <Badge
                                           variant="outline"
                                           className={statusClass(finding.status)}
                                        >
                                           {finding.status === "open"
                                              ? "Open"
                                              : finding.status === "on_progress"
                                                ? "On Progress"
                                                : "Closed"}
                                        </Badge>
                                        {isOverdue(finding.due_date, finding.status) && (
                                           <Badge
                                              variant="outline"
                                              className="bg-red-100 text-destructive border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800"
                                           >
                                              Terlambat
                                           </Badge>
                                        )}
                                     </div>
                                     {finding.due_date && (
                                        <div className="mt-1 text-xs text-muted-foreground">
                                           Tenggat:{" "}
                                           {new Date(finding.due_date).toLocaleDateString("id-ID", {
                                              dateStyle: "medium",
                                           })}
                                        </div>
                                     )}
                                  </TableCell>
                                 <TableCell className="text-sm text-muted-foreground">
                                    <div className="max-w-[260px] whitespace-pre-wrap">
                                       {finding.resolution_note ?? "-"}
                                    </div>
                                 </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                     <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2"
                                        onClick={() =>
                                           openClarificationDialog(finding)
                                        }
                                     >
                                        <MessageSquare className="mr-1 h-3.5 w-3.5" />
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
                                               onClick={() => openEditDialog(finding)}
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
                                                    openStatusDialog(
                                                       finding,
                                                       "on_progress",
                                                    )
                                                 }
                                              >
                                                 On Progress
                                              </Button>
                                              <Button
                                                 size="sm"
                                                 onClick={() =>
                                                    openStatusDialog(
                                                       finding,
                                                       "closed",
                                                    )
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

         <Dialog
            open={!!selectedFinding}
            onOpenChange={(open) => {
               if (!open) closeStatusDialog();
            }}
         >
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>
                     {selectedFinding?.status === "closed"
                        ? "Tutup Temuan"
                        : "Ubah Status Temuan"}
                  </DialogTitle>
                  <DialogDescription>
                     {selectedFinding?.nomorPolisi} - {selectedFinding?.judul}
                  </DialogDescription>
               </DialogHeader>

               <div className="space-y-2 py-4">
                  <label className="text-sm font-medium text-foreground">
                     Catatan penyelesaian
                     {selectedFinding?.status === "closed" ? " *" : ""}
                  </label>
                  <Textarea
                     value={resolutionNote}
                     onChange={(e) => setResolutionNote(e.target.value)}
                     placeholder="Jelaskan tindak lanjut, alasan penutupan, atau hasil klarifikasi"
                     rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                     Catatan ini akan tersimpan di hasil temuan dan membantu audit trail tindak lanjut.
                  </p>
               </div>

               <DialogFooter>
                  <Button variant="outline" onClick={closeStatusDialog}>
                     Batal
                  </Button>
                  <Button onClick={submitStatusUpdate} disabled={statusSaving}>
                     {statusSaving ? "Menyimpan..." : "Simpan Status"}
                  </Button>
               </DialogFooter>
            </DialogContent>
          </Dialog>

         <Dialog
            open={!!clarificationFinding}
            onOpenChange={(open) => {
               if (!open) closeClarificationDialog();
            }}
         >
            <DialogContent className="max-w-lg">
               <DialogHeader>
                  <DialogTitle>Klarifikasi Temuan</DialogTitle>
                  <DialogDescription>
                     {clarificationFinding?.nomor_polisi} —{" "}
                     {clarificationFinding?.judul}
                  </DialogDescription>
               </DialogHeader>

               <div className="space-y-3 py-2">
                  {clarificationFinding?.finding_clarifications?.length ? (
                     <ul className="max-h-[240px] space-y-2 overflow-y-auto">
                        {clarificationFinding.finding_clarifications.map(
                           (c) => (
                              <li
                                 key={c.id}
                                 className="rounded-md border border-border bg-card px-3 py-2"
                              >
                                 <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                       <Badge
                                          variant="outline"
                                          className={
                                             c.responder_role === "po"
                                                ? "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800"
                                                : "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800"
                                          }
                                       >
                                          {c.responder_role === "po"
                                             ? "PO"
                                             : "Staf IW"}
                                       </Badge>
                                       <span className="text-sm font-medium text-foreground">
                                          {formatDecisionLabel(c.decision)}
                                       </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                       {formatDateTime(c.created_at)}
                                    </span>
                                 </div>
                                 <p className="mt-1 text-sm text-muted-foreground">
                                    {c.message}
                                 </p>
                                  {c.evidence &&
                                  typeof c.evidence === "object" &&
                                  c.evidence !== null ? (
                                     <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                        {"link" in c.evidence &&
                                        typeof c.evidence.link === "string" ? (
                                           <a
                                              href={c.evidence.link}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-primary underline underline-offset-2"
                                           >
                                              {c.evidence.link}
                                           </a>
                                        ) : null}
                                        {"file_path" in c.evidence &&
                                        typeof c.evidence.file_path === "string" ? (
                                           <button
                                              onClick={() => downloadEvidence(c.evidence!.file_path as string)}
                                              className="inline-flex items-center gap-1 text-primary hover:underline"
                                           >
                                              <Paperclip className="h-3 w-3" />
                                              {(c.evidence.file_name as string) ?? "Lampiran"}
                                           </button>
                                        ) : null}
                                     </div>
                                  ) : null}
                              </li>
                           ),
                        )}
                     </ul>
                  ) : (
                     <p className="text-sm text-muted-foreground">
                        Belum ada klarifikasi untuk temuan ini.
                     </p>
                  )}
               </div>

               {clarificationFinding?.status !== "closed" ? (
                  <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
                     <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                         <Select
                            value={clarificationDecision}
                            onValueChange={setClarificationDecision}
                         >
                            <SelectTrigger className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                               <SelectValue placeholder="Pilih keputusan" />
                            </SelectTrigger>
                            <SelectContent>
                               <SelectItem value="melengkapi">Melengkapi Bukti</SelectItem>
                               <SelectItem value="menerima">Menerima</SelectItem>
                               <SelectItem value="menolak">Menolak</SelectItem>
                            </SelectContent>
                         </Select>
                        <Textarea
                           value={clarificationMessage}
                           onChange={(e) =>
                              setClarificationMessage(e.target.value)
                           }
                           placeholder="Tulis klarifikasi atau alasan singkat"
                        />
                     </div>
                     <Input
                        value={clarificationEvidenceLink}
                        onChange={(e) =>
                           setClarificationEvidenceLink(e.target.value)
                        }
                        placeholder="Tautan bukti pendukung, jika ada"
                     />
                     <div className="flex items-center gap-2">
                        <input
                           type="file"
                           accept=".pdf,.jpg,.jpeg,.png,.webp"
                           onChange={(e) =>
                              setClarificationFile(e.target.files?.[0] ?? null)
                           }
                           className="text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted/70"
                        />
                        {clarificationFile && (
                           <span className="text-xs text-muted-foreground">
                              {clarificationFile.name} ({(clarificationFile.size / 1024).toFixed(0)} KB)
                           </span>
                        )}
                     </div>
                     <Button
                        size="sm"
                        onClick={submitClarification}
                        disabled={clarificationSaving}
                     >
                        {clarificationSaving ? (
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                           <MessageSquare className="mr-2 h-4 w-4" />
                        )}
                        Kirim Klarifikasi
                     </Button>
                  </div>
               ) : (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:border-green-800 dark:bg-green-950/50 px-3 py-2 text-sm text-brand-green">
                     Temuan ini sudah ditutup.
                  </div>
                )}

               <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                  <div className="text-sm font-medium text-foreground">
                     Tindak Lanjut
                  </div>
                  {clarificationFinding?.finding_actions?.length ? (
                      <ul className="space-y-1.5">
                         {clarificationFinding.finding_actions.map((action) => (
                            <li
                               key={action.id}
                               className="flex items-start gap-2"
                            >
                               <button
                                  onClick={() =>
                                     toggleAction(
                                        clarificationFinding.id,
                                        action.id,
                                        action.status,
                                     )
                                  }
                                  className="mt-0.5 shrink-0"
                               >
                                  {action.status === "done" ? (
                                     <CheckCircle2 className="h-4 w-4 text-brand-green" />
                                  ) : (
                                     <Circle className="h-4 w-4 text-muted-foreground" />
                                  )}
                               </button>
                               <div className="flex-1 min-w-0">
                                  <span
                                     className={`text-sm ${
                                        action.status === "done"
                                           ? "text-muted-foreground line-through"
                                           : "text-foreground"
                                     }`}
                                  >
                                     {action.action_text}
                                  </span>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                     {new Date(action.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                     {action.status === "done" && action.done_at && ` — selesai ${new Date(action.done_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                                  </p>
                               </div>
                            </li>
                         ))}
                      </ul>
                  ) : (
                     <p className="text-xs text-muted-foreground">
                        Belum ada tindakan.
                     </p>
                  )}
                  {clarificationFinding?.status !== "closed" && (
                     <div className="flex gap-2">
                        <Input
                           value={actionText}
                           onChange={(e) => setActionText(e.target.value)}
                           placeholder="Tambah tindakan..."
                           className="h-8 text-sm"
                           onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                 e.preventDefault();
                                 addAction();
                              }
                           }}
                        />
                        <Button
                           size="sm"
                           variant="outline"
                           className="h-8 shrink-0 px-2"
                           onClick={addAction}
                           disabled={actionSaving || !actionText.trim()}
                        >
                           {actionSaving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                           ) : (
                              <Plus className="h-3.5 w-3.5" />
                           )}
                        </Button>
                     </div>
                  )}
               </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-3 py-2 text-sm text-destructive">
                     <AlertCircle className="mt-0.5 h-4 w-4" />
                     <span>{error}</span>
                  </div>
               )}
            </DialogContent>
          </Dialog>

         <Dialog
            open={!!editFinding}
            onOpenChange={(open) => {
               if (!open) closeEditDialog();
            }}
         >
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Edit Temuan</DialogTitle>
                  <DialogDescription>
                     {editFinding?.nomor_polisi} — {editFinding?.po?.nama_perusahaan ?? editFinding?.po_id}
                  </DialogDescription>
               </DialogHeader>

               <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium text-foreground">
                        Judul *
                     </label>
                     <Input
                        value={editForm.judul}
                        onChange={(e) =>
                           setEditForm((f) => ({ ...f, judul: e.target.value }))
                        }
                     />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium text-foreground">
                        Deskripsi
                     </label>
                     <Textarea
                        value={editForm.deskripsi}
                        onChange={(e) =>
                           setEditForm((f) => ({ ...f, deskripsi: e.target.value }))
                        }
                        rows={4}
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                           Severity
                        </label>
                         <Select
                            value={editForm.severity}
                            onValueChange={(v) =>
                               setEditForm((f) => ({ ...f, severity: v }))
                            }
                         >
                            <SelectTrigger className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring/30">
                               <SelectValue placeholder="Pilih Severity" />
                            </SelectTrigger>
                            <SelectContent>
                               <SelectItem value="low">Rendah</SelectItem>
                               <SelectItem value="medium">Sedang</SelectItem>
                               <SelectItem value="high">Tinggi</SelectItem>
                            </SelectContent>
                         </Select>
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                           Tenggat
                        </label>
                        <Input
                           type="date"
                           value={editForm.dueDate}
                           onChange={(e) =>
                              setEditForm((f) => ({ ...f, dueDate: e.target.value }))
                           }
                        />
                     </div>
                  </div>
               </div>

               <DialogFooter>
                  <Button variant="outline" onClick={closeEditDialog}>
                     Batal
                  </Button>
                  <Button onClick={submitEdit} disabled={editSaving}>
                     {editSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     ) : null}
                     Simpan Perubahan
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
       </div>
   );
}
