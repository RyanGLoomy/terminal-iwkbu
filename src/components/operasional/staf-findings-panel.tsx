"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { formatDateTime, formatDate } from "@/lib/utils/format-date";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import { AlertCircle, MessageSquare, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import { getErrorMessage } from "@/lib/db-error";
import {
   FINDINGS_PAGE_SIZE,
   isOverdue,
   getDueDateBadge,
} from "./findings-shared";
import { HighlightText } from "./highlight-text";
import { StafFindingDetailSheet } from "./staf-finding-detail-sheet";
const StafFindingsStatusDialog = dynamic(() =>
   import("./staf-findings-status-dialog").then((m) => ({ default: m.StafFindingsStatusDialog })),
);
const StafFindingsClarificationDialog = dynamic(() =>
   import("./staf-findings-clarification-dialog").then((m) => ({ default: m.StafFindingsClarificationDialog })),
);
const StafFindingsEditDialog = dynamic(() =>
   import("./staf-findings-edit-dialog").then((m) => ({ default: m.StafFindingsEditDialog })),
);

type Option = { id: string; label: string };

export function StafFindingsPanel({
   initialFindings,
   poOptions,
   armadaOptions,
   prefill,
   periodeOptions,
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
   periodeOptions?: { id: string; nama_periode: string }[];
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
   const searchParams = useSearchParams();
   const highlightId = searchParams.get("highlight");
   const [editFinding, setEditFinding] = useState<FindingRecord | null>(null);
   const [detailFinding, setDetailFinding] = useState<FindingRecord | null>(null);
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
   const searchRef = useRef<HTMLInputElement>(null);
    const [statusFilter, setStatusFilter] = useState("semua");
   const [periodeFilter, setPeriodeFilter] = useState("semua");
   const [sortKey, setSortKey] = useState<"created_at" | "severity" | "status" | null>(null);
   const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
   const [visibleCount, setVisibleCount] = useState(FINDINGS_PAGE_SIZE);

   const SEVERITY_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2 };

   const toggleSort = (key: "created_at" | "severity" | "status") => {
      if (sortKey === key) {
         setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
         setSortKey(key);
         setSortDir("desc");
      }
   };

    const filteredFindings = (() => {
       let result = initialFindings;
       if (statusFilter !== "semua") {
          result = result.filter((f) => f.status === statusFilter);
       }
       if (periodeFilter !== "semua") {
          if (periodeFilter === "tanpa_periode") {
             result = result.filter((f) => !f.periode_id);
          } else {
             result = result.filter((f) => f.periode_id === periodeFilter);
          }
       }
      if (deferredSearch.trim()) {
         const q = deferredSearch.trim().toLowerCase();
         result = result.filter(
            (f) =>
               f.judul.toLowerCase().includes(q) ||
               f.nomor_polisi.toLowerCase().includes(q) ||
               (f.po?.kode_po ?? "").toLowerCase().includes(q) ||
               (f.po?.nama_perusahaan ?? "").toLowerCase().includes(q) ||
               (f.deskripsi ?? "").toLowerCase().includes(q),
         );
      }
      if (sortKey) {
         const dir = sortDir === "asc" ? 1 : -1;
         result = [...result].sort((a, b) => {
            if (sortKey === "severity") {
               return (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) * dir;
            }
            if (sortKey === "status") {
               return a.status.localeCompare(b.status) * dir;
            }
            return a.created_at.localeCompare(b.created_at) * dir;
         });
      }
      return result;
   })();

   const visibleFindings = filteredFindings.slice(0, visibleCount);

    // Scroll to highlighted finding from notification + trigger glow.
    // Reset filter & expand pagination first so the target row is guaranteed
    // to be in the DOM; otherwise scrollIntoView silently fails when the row
    // is filtered out or beyond the "show more" page.
    const [glowKey, setGlowKey] = useState(0);
    useEffect(() => {
       if (!highlightId) return;
       if (!initialFindings.some((f) => f.id === highlightId)) return;
       setSearch("");
       setStatusFilter("semua");
       setPeriodeFilter("semua");
       setVisibleCount(initialFindings.length);
       setGlowKey((k) => k + 1);
       const timer = setTimeout(() => {
          const el = document.querySelector("[data-highlight-id]");
          if (el) {
             el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
       }, 300);
       return () => clearTimeout(timer);
       // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [highlightId]);

   // S4: Live findings updates via Realtime (debounced router.refresh)
   useEffect(() => {
      const supabase = createClient();
      let pending = false;
      const channel = supabase
         .channel(`findings-staf:${crypto.randomUUID()}`)
         .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "findings" },
            () => {
               if (pending) return;
               pending = true;
               setTimeout(() => {
                  router.refresh();
                  pending = false;
               }, 2000);
            },
         )
         .subscribe();
      return () => supabase.removeChannel(channel);
   }, [router]);

   // '/' focuses search (unless already typing in an input)
   useEffect(() => {
      const handler = (e: KeyboardEvent) => {
         if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
            e.preventDefault();
            searchRef.current?.focus();
         }
      };
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
   }, []);

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
                   <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                         ref={searchRef}
                         placeholder="Cari temuan... (tekan /)"
                         value={search}
                         onChange={(e) => {
                            setSearch(e.target.value);
                            setVisibleCount(FINDINGS_PAGE_SIZE);
                         }}
                         className="h-8 w-full text-sm sm:w-48"
                      />
                       <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setVisibleCount(FINDINGS_PAGE_SIZE); }}>
                          <SelectTrigger className="h-8 w-full text-sm sm:w-32">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="semua">Semua Status</SelectItem>
                             <SelectItem value="open">Open</SelectItem>
                             <SelectItem value="on_progress">On Progress</SelectItem>
                             <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                       </Select>
                       {periodeOptions && periodeOptions.length > 0 && (
                          <Select value={periodeFilter} onValueChange={(v) => { setPeriodeFilter(v); setVisibleCount(FINDINGS_PAGE_SIZE); }}>
                             <SelectTrigger className="h-8 w-full text-sm sm:w-40">
                                <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                                <SelectItem value="semua">Semua Periode</SelectItem>
                                <SelectItem value="tanpa_periode">Tanpa Periode</SelectItem>
                                {periodeOptions.map((p) => (
                                   <SelectItem key={p.id} value={p.id}>{p.nama_periode}</SelectItem>
                                ))}
                             </SelectContent>
                          </Select>
                       )}
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
                                    ? formatDateTime(f.created_at)
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
                               toast.error("Gagal mengekspor PDF temuan.");
                            }
                        }}
                     >
                        PDF
                     </Button>
                  </div>
               </div>
                <div className="hidden overflow-hidden rounded-lg border border-base-300 bg-base-100 sm:block">
                   <Table caption="Daftar temuan Staf IW">
                      <TableHeader>
                         <TableRow>
                            <TableHead>
                               <button type="button" className="inline-flex items-center gap-1 hover:text-base-content" onClick={() => toggleSort("created_at")}>
                                  Waktu
                                  {sortKey === "created_at" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                               </button>
                            </TableHead>
                            <TableHead>PO</TableHead>
                            <TableHead>Judul</TableHead>
                            <TableHead>
                               <button type="button" className="inline-flex items-center gap-1 hover:text-base-content" onClick={() => toggleSort("severity")}>
                                  Severity
                                  {sortKey === "severity" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                               </button>
                            </TableHead>
                            <TableHead>
                               <button type="button" className="inline-flex items-center gap-1 hover:text-base-content" onClick={() => toggleSort("status")}>
                                  Status
                                  {sortKey === "status" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                               </button>
                            </TableHead>
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
                                <TableRow
                                   key={`${finding.id}-${glowKey}`}
                                   className={`cursor-pointer transition-colors hover:bg-base-200/50 ${highlightId === finding.id ? "highlight-from-notification" : ""}`}
                                   data-highlight-id={highlightId === finding.id ? "" : undefined}
                                   onClick={() => setDetailFinding(finding)}
                                >
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
                                        <HighlightText text={finding.judul} query={deferredSearch} />
                                     </div>
                                     <div className="text-xs text-base-content/70">
                                        <HighlightText text={finding.nomor_polisi} query={deferredSearch} />
                                     </div>
                                  </TableCell>
                                 <TableCell>
                                    <StatusBadge category="severity" value={finding.severity} />
                                 </TableCell>
                                 <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                       <StatusBadge category="finding" value={finding.status} />
                                       {(() => {
                                          const badge = getDueDateBadge(finding.due_date, finding.status);
                                          return badge ? (
                                             <Badge variant="outline" className={`text-[11px] ${badge.color}`}>
                                                {badge.label}
                                             </Badge>
                                          ) : null;
                                       })()}
                                    </div>
                                    {finding.due_date && (
                                       <div className="mt-1 text-xs text-base-content/70">
                                          Tenggat:{" "}
                                          {formatDate(finding.due_date)}
                                       </div>
                                    )}
                                 </TableCell>
                                 <TableCell className="text-sm text-base-content/70">
                                    <div className="max-w-[260px] whitespace-pre-wrap">
                                       {finding.resolution_note ?? "-"}
                                    </div>
                                 </TableCell>
                                 <TableCell className="text-sm text-base-content/70" onClick={(e) => e.stopPropagation()}>
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
                                 <TableCell onClick={(e) => e.stopPropagation()}>
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

                {/* Mobile card layout */}
                <div className="space-y-3 sm:hidden">
                   {filteredFindings.length === 0 ? (
                      <Card>
                         <CardContent className="py-8 text-center text-sm text-base-content/70">
                            {initialFindings.length === 0
                               ? "Belum ada temuan."
                               : "Tidak ada temuan yang cocok."}
                         </CardContent>
                      </Card>
                   ) : (
                       visibleFindings.map((finding) => (
                          <Card
                             key={`${finding.id}-${glowKey}`}
                             className={`cursor-pointer transition-colors hover:bg-base-200/40 ${highlightId === finding.id ? "highlight-from-notification" : ""}`}
                             data-highlight-id={highlightId === finding.id ? "" : undefined}
                             onClick={() => setDetailFinding(finding)}
                          >
                             <CardContent className="space-y-2 py-3">
                               <div className="flex items-center gap-2">
                                  <StatusBadge category="severity" value={finding.severity} />
                                  <StatusBadge category="finding" value={finding.status} />
                                  {(() => {
                                     const badge = getDueDateBadge(finding.due_date, finding.status);
                                     return badge ? (
                                        <Badge variant="outline" className={`text-[11px] ${badge.color}`}>
                                           {badge.label}
                                        </Badge>
                                     ) : null;
                                  })()}
                               </div>
                               <div>
                                  <p className="font-medium text-sm text-base-content"><HighlightText text={finding.judul} query={deferredSearch} /></p>
                                  <p className="text-xs text-base-content/70"><HighlightText text={`${finding.nomor_polisi} · ${finding.po?.nama_perusahaan ?? finding.po?.kode_po ?? "-"}`} query={deferredSearch} /></p>
                               </div>
                               <p className="text-xs text-base-content/60">{formatDateTime(finding.created_at)}</p>
                                <div className="flex flex-wrap gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                                   <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setClarificationFinding(finding)}>
                                     <MessageSquare className="mr-1 h-3.5 w-3.5" />
                                     {finding.finding_clarifications?.length ?? 0}
                                  </Button>
                                  {finding.status !== "closed" && (
                                     <>
                                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditFinding(finding)}>
                                           <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-7" onClick={() => setStatusDialog({ finding, targetStatus: "closed" })}>
                                           Tutup
                                        </Button>
                                     </>
                                  )}
                               </div>
                            </CardContent>
                         </Card>
                      ))
                   )}
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

          <StafFindingDetailSheet
             finding={detailFinding}
             open={!!detailFinding}
             onOpenChange={(o) => { if (!o) setDetailFinding(null); }}
             onEdit={(f) => setEditFinding(f)}
             onStatusChange={(f, target) => setStatusDialog({ finding: f, targetStatus: target })}
             onReopen={(id) => reopenFinding(id)}
             onClarify={(f) => setClarificationFinding(f)}
          />
       </div>
    );
}
