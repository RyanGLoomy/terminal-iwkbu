"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { formatDate } from "@/lib/utils/format-date";
import { EvidenceAttachment } from "./evidence-attachment";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { StatusBadge } from "@/components/shared/status-badge";
import type { FindingRecord } from "@/lib/supabase/queries/operasional.types";
import { toast } from "sonner";
import { AlertCircle, Loader2, MessageSquare, CheckCircle2, Circle, Paperclip } from "lucide-react";
import { getErrorMessage } from "@/lib/db-error";
import {
   FINDINGS_PAGE_SIZE,
   formatDecisionLabel,
   formatDateTime,
   isOverdue,
} from "./findings-shared";
import { FindingsPagination } from "./findings-pagination";
import { PoClarificationForm } from "./po-clarification-form";

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

export function PoFindingsPanel({ findings }: { findings: FindingRecord[] }) {
   const router = useRouter();
   const searchParams = useSearchParams();
   const highlightId = searchParams.get("highlight");
   const [search, setSearch] = useState("");
   const deferredSearch = useDeferredValue(search);
   const [statusFilter, setStatusFilter] = useState("semua");
   const [page, setPage] = useState(1);

     const filteredFindings = (() => {
       let result = findings;
       if (statusFilter !== "semua") {
          result = result.filter((f) => f.status === statusFilter);
       }
       if (!deferredSearch.trim()) return result;
       const q = deferredSearch.trim().toLowerCase();
       return result.filter(
          (f) =>
             f.judul.toLowerCase().includes(q) ||
             f.nomor_polisi.toLowerCase().includes(q) ||
          (f.deskripsi ?? "").toLowerCase().includes(q),
       );
    })();
   const pageCount = Math.max(1, Math.ceil(filteredFindings.length / FINDINGS_PAGE_SIZE));
   const safePage = Math.min(page, pageCount);
   const pagedFindings = filteredFindings.slice(
      (safePage - 1) * FINDINGS_PAGE_SIZE,
      safePage * FINDINGS_PAGE_SIZE,
   );

   const openCount = findings.filter((item) => item.status === "open").length;
   const progressCount = findings.filter(
      (item) => item.status === "on_progress",
   ).length;
    const closedCount = findings.filter(
       (item) => item.status === "closed",
    ).length;

   // S4: Live findings updates via Realtime (debounced router.refresh)
   useEffect(() => {
      const supabase = createClient();
      let pending = false;
      const channel = supabase
         .channel(`findings-po:${crypto.randomUUID()}`)
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

    // Scroll to highlighted finding from notification + trigger glow.
    // Reset filter + jump to the page containing the target card so the
    // element is guaranteed to be in the DOM before scrollIntoView.
    const [glowKey, setGlowKey] = useState(0);
    useEffect(() => {
       if (!highlightId) return;
       const idx = findings.findIndex((f) => f.id === highlightId);
       if (idx === -1) return;
       setSearch("");
       setStatusFilter("semua");
       setPage(Math.floor(idx / FINDINGS_PAGE_SIZE) + 1);
       setGlowKey((k) => k + 1);
       const timer = setTimeout(() => {
          const el = document.querySelector("[data-highlight-id]");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
       }, 300);
       return () => clearTimeout(timer);
       // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [highlightId]);


    return (
      <div className="space-y-5">
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
               title="Total Temuan"
               value={String(findings.length)}
               description="Untuk armada PO ini"
               icon="alert-triangle"
               accent="blue"
               index={0}
            />
            <DashboardCard
               title="Open"
               value={String(openCount)}
               description="Menunggu jawaban"
               icon="clock"
               accent="amber"
               index={1}
            />
            <DashboardCard
               title="On Progress"
               value={String(progressCount)}
               description="Sudah ada tindak lanjut"
               icon="activity"
               accent="violet"
               index={2}
            />
            <DashboardCard
               title="Closed"
               value={String(closedCount)}
               description="Sudah diselesaikan"
               icon="check-circle"
               accent="green"
               index={3}
            />
         </div>

         {findings.length === 0 ? (
             <Card className="border-base-300">
                <CardContent className="py-8 text-center text-sm text-base-content/70">
                   Belum ada temuan untuk PO ini.
                </CardContent>
             </Card>
          ) : (
             <div className="space-y-4">
                 <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-base-content/70">
                       {filteredFindings.length}
                       {filteredFindings.length !== findings.length &&
                          ` dari ${findings.length}`}{" "}
                       temuan
                    </span>
                    <div className="flex flex-col gap-2 sm:flex-row">
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
                       <SelectTrigger className="h-8 w-full text-sm sm:w-32">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="semua">Semua</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="on_progress">On Progress</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                       </SelectContent>
                    </Select>
                    </div>
                 </div>
                {filteredFindings.length === 0 ? (
                   <Card>
                      <CardContent className="py-8 text-center text-sm text-base-content/70">
                         Tidak ada temuan yang cocok dengan pencarian.
                      </CardContent>
                   </Card>
                ) : (
                  pagedFindings.map((finding) => (
                    <Card key={`${finding.id}-${glowKey}`} className={`border-base-300 ${highlightId === finding.id ? "highlight-from-notification" : ""}`} data-highlight-id={highlightId === finding.id ? "" : undefined}>
                       <CardHeader className="space-y-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                             <div>
                                <CardTitle className="text-base">
                                   {finding.judul}
                                </CardTitle>
                               <p className="text-sm text-base-content/70 mt-1">
                                  {finding.nomor_polisi} ·{" "}
                                  {formatDateTime(finding.created_at)}
                                  {finding.due_date && (
                                     <span className="ml-2">
                                        · Tenggat:{" "}
                                        {formatDate(finding.due_date)}
                                     </span>
                                  )}
                               </p>
                               {isOverdue(finding.due_date, finding.status) && (
                                  <Badge variant="outline" className="bg-red-100 text-error border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800 w-fit">
                                     Terlambat
                                  </Badge>
                               )}
                           </div>
                            <StatusBadge category="severity" value={finding.severity} />
                            <StatusBadge category="finding" value={finding.status} />
                         </div>
                       </CardHeader>
                       <CardContent className="space-y-4">

                        <p className="text-sm text-base-content">
                           {finding.deskripsi}
                        </p>
                        <div className="rounded-lg border border-base-300 bg-base-200/50 p-3 text-sm text-base-content/70">
                           <div className="font-medium text-base-content">
                              Klarifikasi sebelumnya
                           </div>
                           {finding.finding_clarifications?.length ? (
                              <ul className="mt-2 space-y-2">
                                 {finding.finding_clarifications.map(
                                    (clarification) => (
                                       <li
                                          key={clarification.id}
                                          className="rounded-md border border-base-300 bg-base-100 px-3 py-2"
                                       >
                                           <div className="flex items-center justify-between gap-3">
                                              <div className="flex items-center gap-2">
                                                 <Badge
                                                    variant="outline"
                                                    className={
                                                       clarification.responder_role ===
                                                       "po"
                                                          ? "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800"
                                                          : "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800"
                                                    }
                                                 >
                                                    {clarification.responder_role ===
                                                    "po"
                                                       ? "PO"
                                                       : "Staf IW"}
                                                 </Badge>
                                                 <span className="font-medium text-base-content">
                                                    {formatDecisionLabel(
                                                       clarification.decision,
                                                    )}
                                                 </span>
                                              </div>
                                             <span className="text-xs text-base-content/70">
                                                {formatDateTime(
                                                   clarification.created_at,
                                                )}
                                             </span>
                                          </div>
                                           <p className="mt-1 text-sm text-base-content/70">
                                              {clarification.message}
                                           </p>
                                            {clarification.evidence &&
                                            typeof clarification.evidence ===
                                               "object" &&
                                            clarification.evidence !== null ? (
                                               <EvidenceAttachment evidence={clarification.evidence as Record<string, unknown>} />
                                            ) : null}
                                       </li>
                                    ),
                                 )}
                              </ul>
                           ) : (
                              <p className="mt-2 text-sm text-base-content/70">
                                 Belum ada klarifikasi.
                              </p>
                           )}
                         </div>

                         {finding.finding_actions && finding.finding_actions.length > 0 && (
                            <div className="rounded-lg border border-base-300 bg-base-100 p-3">
                               <div className="text-sm font-medium text-base-content mb-2">
                                  Tindak Lanjut Staf IW
                               </div>
                               <ul className="space-y-1.5">
                                  {finding.finding_actions.map((action) => (
                                     <li key={action.id} className="flex items-start gap-2">
                                        {action.status === "done" ? (
                                           <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" aria-hidden="true" />
                                        ) : (
                                           <Circle className="mt-0.5 h-4 w-4 shrink-0 text-base-content/70" aria-hidden="true" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                           <span className={`text-sm ${action.status === "done" ? "text-base-content/70 line-through" : "text-base-content"}`}>
                                              {action.action_text}
                                           </span>
                                           <p className="text-xs text-base-content/70 mt-0.5">
                                              {formatDateTime(action.created_at)}
                                              {action.status === "done" && action.done_at && ` — selesai ${formatDateTime(action.done_at)}`}
                                           </p>
                                        </div>
                                     </li>
                                  ))}
                               </ul>
                            </div>
                         )}

                         {finding.status !== "closed" ? (
                           <PoClarificationForm findingId={finding.id} />
                        ) : (
                            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300">
                               Temuan ini sudah ditutup oleh Staf IW.
                           </div>
                        )}
                       </CardContent>
                     </Card>
                   ))

                  )}
                  <FindingsPagination
                     page={safePage}
                     pageCount={pageCount}
                     total={filteredFindings.length}
                     pageSize={FINDINGS_PAGE_SIZE}
                     onPageChange={setPage}
                  />
               </div>
            )}
      </div>
   );
}
