"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils/format-date";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
} from "@/components/ui/dialog";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import clockLottie from "@/lib/lottie/clock.json";
import activityLottie from "@/lib/lottie/activity.json";
import alertTriangleLottie from "@/lib/lottie/alert-triangle.json";
import { STATUS_MAP } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FindingRecord } from "@/lib/supabase/queries/operasional.types";
import { IconPlus, IconDownload } from "@tabler/icons-react";
import {
   FINDINGS_PAGE_SIZE,
} from "./findings-shared";
import { FindingsPagination } from "./findings-pagination";
import { FindingListItem } from "./finding-list-item";
import { StafFindingCreateForm } from "./staf-finding-create-form";

type Option = { id: string; label: string };

type SortKey = "newest" | "oldest" | "sev_desc" | "sev_asc" | "status_asc" | "status_desc";

const SEVERITY_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2 };

function sortFindings(list: FindingRecord[], sort: SortKey): FindingRecord[] {
   const sorted = [...list];
   switch (sort) {
      case "oldest":
         return sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
      case "sev_desc":
         return sorted.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);
      case "sev_asc":
         return sorted.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
      case "status_asc":
         return sorted.sort((a, b) => a.status.localeCompare(b.status));
      case "status_desc":
         return sorted.sort((a, b) => b.status.localeCompare(a.status));
      case "newest":
      default:
         return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
   }
}

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
   const searchParams = useSearchParams();
   const highlightId = searchParams.get("highlight");

   const [search, setSearch] = useState("");
   const deferredSearch = useDeferredValue(search);
   const [statusFilter, setStatusFilter] = useState("semua");
   const [periodeFilter, setPeriodeFilter] = useState("semua");
   const [sort, setSort] = useState<SortKey>("newest");
   const [page, setPage] = useState(1);
   const [createOpen, setCreateOpen] = useState(false);

   const stats = {
      open: initialFindings.filter((i) => i.status === "open").length,
      progress: initialFindings.filter((i) => i.status === "on_progress").length,
      closed: initialFindings.filter((i) => i.status === "closed").length,
      total: initialFindings.length,
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
      return sortFindings(result, sort);
   })();

   const pageCount = Math.max(1, Math.ceil(filteredFindings.length / FINDINGS_PAGE_SIZE));
   const safePage = Math.min(page, pageCount);
   const pagedFindings = filteredFindings.slice(
      (safePage - 1) * FINDINGS_PAGE_SIZE,
      safePage * FINDINGS_PAGE_SIZE,
   );

   // Highlight dari ?highlight=<id>: reset filter + lompat ke halaman target.
   const [glowKey, setGlowKey] = useState(0);
   useEffect(() => {
      if (!highlightId) return;
      const idx = initialFindings.findIndex((f) => f.id === highlightId);
      if (idx === -1) return;
      setSearch("");
      setStatusFilter("semua");
      setPeriodeFilter("semua");
      setSort("newest");
      // index di array asli (urutan server). Karena reset filter+sort=newest,
      // urutan filteredFindings == initialFindings (created_at desc).
      setPage(Math.floor(idx / FINDINGS_PAGE_SIZE) + 1);
      setGlowKey((k) => k + 1);
      const timer = setTimeout(() => {
         const el = document.querySelector("[data-highlight-id]");
         if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [highlightId]);

   // Live findings via Realtime (debounced router.refresh)
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

   function exportCsv() {
      if (filteredFindings.length === 0) return;
      const headers = ["Waktu", "Kode PO", "Nama PO", "Nomor Polisi", "Judul", "Status", "Catatan", "Klarifikasi"];
      const rows = filteredFindings.map((f) => [
         f.created_at,
         f.po?.kode_po ?? f.po_id,
         f.po?.nama_perusahaan ?? "",
         f.nomor_polisi,
         f.judul,
         STATUS_MAP.finding[f.status]?.label ?? f.status,
         f.resolution_note ?? "",
         String(f.finding_clarifications?.length ?? 0),
      ]);
      const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "temuan-staf-iw.csv";
      a.click();
      URL.revokeObjectURL(url);
   }

   async function exportPdf() {
      if (filteredFindings.length === 0) return;
      try {
         const { jsPDF } = await import("jspdf");
         const autoTable = (await import("jspdf-autotable")).default;
         const doc = new jsPDF({ orientation: "landscape" });
         const body = filteredFindings.map((f) => [
            formatDateTime(f.created_at),
            f.po?.kode_po ?? f.po_id,
            f.nomor_polisi,
            f.judul,
            f.status === "open" ? "Open" : f.status === "on_progress" ? "On Progress" : "Closed",
            f.resolution_note ?? "-",
         ]);
         // @ts-ignore - jsPDF autotable typings
         autoTable(doc, {
            head: [["Waktu", "PO", "Nomor Polisi", "Judul", "Status", "Catatan"]],
            body,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 80, 179] },
         });
         doc.save("temuan-staf-iw.pdf");
      } catch {
         // noop
      }
   }

   return (
      <div className="space-y-5">
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
             <DashboardCard title="Total Temuan" value={String(stats.total)} description="Catatan yang tersimpan" icon="alert-triangle" lottieAnimation={alertTriangleLottie} accent="blue" index={0} />
             <DashboardCard title="Open" value={String(stats.open)} description="Menunggu tindak lanjut" icon="clock" lottieAnimation={clockLottie} accent="amber" index={1} />
             <DashboardCard title="On Progress" value={String(stats.progress)} description="Sedang diklarifikasi" icon="activity" lottieAnimation={activityLottie} accent="violet" index={2} />
             <DashboardCard title="Closed" value={String(stats.closed)} description="Sudah diselesaikan" icon="check-circle" accent="green" index={3} />
         </div>

         {/* Toolbar */}
         <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
               <span className="text-sm font-medium text-base-content">
                  Daftar Temuan ({filteredFindings.length}
                  {filteredFindings.length !== initialFindings.length && ` dari ${initialFindings.length}`})
               </span>
               <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <IconPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Buat Temuan
               </Button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
               <Input
                  placeholder="Cari temuan..."
                  value={search}
                  onChange={(e) => {
                     setSearch(e.target.value);
                     setPage(1);
                  }}
                  className="h-8 w-full text-sm sm:w-56"
               />
               <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="h-8 w-full text-sm sm:w-36">
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
                  <Select value={periodeFilter} onValueChange={(v) => { setPeriodeFilter(v); setPage(1); }}>
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
               <Select value={sort} onValueChange={(v) => { setSort(v as SortKey); setPage(1); }}>
                  <SelectTrigger className="h-8 w-full text-sm sm:w-44">
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="newest">Terbaru</SelectItem>
                     <SelectItem value="oldest">Terlama</SelectItem>
                     <SelectItem value="sev_desc">Severity Tinggi→Rendah</SelectItem>
                     <SelectItem value="sev_asc">Severity Rendah→Tinggi</SelectItem>
                     <SelectItem value="status_asc">Status A→Z</SelectItem>
                     <SelectItem value="status_desc">Status Z→A</SelectItem>
                  </SelectContent>
               </Select>
               <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportCsv}>
                     <IconDownload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                     CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportPdf}>
                     <IconDownload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                     PDF
                  </Button>
               </div>
            </div>
         </div>

         {/* List */}
         {filteredFindings.length === 0 ? (
            <Card>
               <CardContent className="py-8 text-center text-sm text-base-content/70">
                  {initialFindings.length === 0 ? "Belum ada temuan." : "Tidak ada temuan yang cocok dengan pencarian."}
               </CardContent>
            </Card>
         ) : (
            <div className="space-y-2.5">
               {pagedFindings.map((finding) => (
                  <FindingListItem
                     key={`${finding.id}-${highlightId === finding.id ? glowKey : 0}`}
                     finding={finding}
                     href={`/staf-iw/temuan/${finding.id}`}
                     highlight={highlightId === finding.id}
                  />
               ))}
            </div>
         )}

         <FindingsPagination
            page={safePage}
            pageCount={pageCount}
            total={filteredFindings.length}
            pageSize={FINDINGS_PAGE_SIZE}
            onPageChange={setPage}
         />

         {/* Modal Buat Temuan */}
         <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="max-w-2xl">
               <DialogHeader>
                  <DialogTitle>Buat Temuan Baru</DialogTitle>
                  <DialogDescription className="sr-only">Form pembuatan temuan</DialogDescription>
               </DialogHeader>
               <StafFindingCreateForm
                  poOptions={poOptions}
                  armadaOptions={armadaOptions}
                  prefill={prefill}
                  onSuccess={() => setCreateOpen(false)}
               />
            </DialogContent>
         </Dialog>
      </div>
   );
}
