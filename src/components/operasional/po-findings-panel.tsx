"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import type {
   FindingRecord,
   FindingSeverity,
} from "@/lib/supabase/queries/operasional.types";
import { toast } from "sonner";
import { AlertCircle, Loader2, MessageSquare, CheckCircle2, Circle, Paperclip } from "lucide-react";

function statusClass(status: FindingRecord["status"]) {
   if (status === "closed")
      return "bg-emerald-100 text-brand-green border-emerald-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800";
   if (status === "on_progress")
      return "bg-amber-100 text-accent border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
   return "bg-muted text-foreground border-border";
}

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

function formatDateTime(value: string) {
   return new Date(value).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
   });
}

const FINDINGS_PAGE_SIZE = 10;

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

function ClarificationForm({ findingId }: { findingId: string }) {
   const router = useRouter();
   const [decision, setDecision] = useState("melengkapi");
   const [message, setMessage] = useState("");
   const [evidenceLink, setEvidenceLink] = useState("");
   const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const submit = async () => {
      setLoading(true);
      setError(null);

      try {
         const formData = new FormData();
         formData.append("decision", decision);
         formData.append("message", message);
         if (evidenceLink) formData.append("evidenceLink", evidenceLink);
         if (evidenceFile) formData.append("evidenceFile", evidenceFile);

         const response = await fetch(
            `/api/po/findings/${findingId}/clarifications`,
            {
               method: "POST",
               body: formData,
            },
         );

         const payload = await response.json();
         if (!response.ok) {
            throw new Error(payload.message ?? "Gagal mengirim klarifikasi");
         }

         setMessage("");
         setEvidenceLink("");
         setEvidenceFile(null);
         toast.success("Klarifikasi berhasil dikirim");
         router.refresh();
        } catch (err: any) {
           setError(err?.message ?? "Gagal mengirim klarifikasi");
       } finally {
          setLoading(false);
       }
    };

   return (
      <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
         <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
            <Select value={decision} onValueChange={setDecision}>
               <SelectTrigger>
                  <SelectValue placeholder="Pilih tindakan" />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="melengkapi">Melengkapi Bukti</SelectItem>
                  <SelectItem value="menerima">Menerima</SelectItem>
                  <SelectItem value="menolak">Menolak</SelectItem>
               </SelectContent>
            </Select>
            <Textarea
               value={message}
               onChange={(e) => setMessage(e.target.value)}
               placeholder="Tulis klarifikasi atau alasan singkat"
            />
         </div>
         <Input
            value={evidenceLink}
            onChange={(e) => setEvidenceLink(e.target.value)}
            placeholder="Tautan bukti pendukung, jika ada"
         />
         <div className="flex items-center gap-2">
            <input
               type="file"
               accept=".pdf,.jpg,.jpeg,.png,.webp"
               onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
               className="text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted/70"
            />
            {evidenceFile && (
               <span className="text-xs text-muted-foreground">
                  {evidenceFile.name} ({(evidenceFile.size / 1024).toFixed(0)} KB)
               </span>
            )}
         </div>
         {error && (
            <div className="flex items-start gap-2 text-sm text-destructive">
               <AlertCircle className="mt-0.5 h-4 w-4" />
               <span>{error}</span>
            </div>
         )}
         <Button size="sm" onClick={submit} disabled={loading}>
            {loading ? (
               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
               <MessageSquare className="mr-2 h-4 w-4" />
            )}
            Kirim Klarifikasi
         </Button>
      </div>
   );
}

export function PoFindingsPanel({ findings }: { findings: FindingRecord[] }) {
   const [search, setSearch] = useState("");
   const deferredSearch = useDeferredValue(search);
   const [visibleCount, setVisibleCount] = useState(FINDINGS_PAGE_SIZE);
   const filteredFindings = useMemo(() => {
      if (!deferredSearch.trim()) return findings;
      const q = deferredSearch.trim().toLowerCase();
      return findings.filter(
         (f) =>
            f.judul.toLowerCase().includes(q) ||
            f.nomor_polisi.toLowerCase().includes(q) ||
         (f.deskripsi ?? "").toLowerCase().includes(q),
      );
   }, [findings, deferredSearch]);
   const visibleFindings = filteredFindings.slice(0, visibleCount);

   const openCount = findings.filter((item) => item.status === "open").length;
   const progressCount = findings.filter(
      (item) => item.status === "on_progress",
   ).length;
   const closedCount = findings.filter(
      (item) => item.status === "closed",
   ).length;

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
             <Card className="border-border">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                   Belum ada temuan untuk PO ini.
                </CardContent>
             </Card>
          ) : (
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <span className="text-sm text-muted-foreground">
                      {filteredFindings.length}
                      {filteredFindings.length !== findings.length &&
                         ` dari ${findings.length}`}{" "}
                      temuan
                   </span>
                   <Input
                      placeholder="Cari temuan..."
                      value={search}
                      onChange={(e) => {
                         setSearch(e.target.value);
                         setVisibleCount(FINDINGS_PAGE_SIZE);
                      }}
                      className="h-8 w-56 text-sm"
                   />
                </div>
                {filteredFindings.length === 0 ? (
                   <Card>
                      <CardContent className="py-8 text-center text-sm text-muted-foreground">
                         Tidak ada temuan yang cocok dengan pencarian.
                      </CardContent>
                   </Card>
                ) : (
                visibleFindings.map((finding) => (
                  <Card key={finding.id} className="border-border">
                     <CardHeader className="space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                           <div>
                               <CardTitle className="text-base">
                                  {finding.judul}
                               </CardTitle>
                               <p className="text-sm text-muted-foreground mt-1">
                                  {finding.nomor_polisi} ·{" "}
                                  {formatDateTime(finding.created_at)}
                                  {finding.due_date && (
                                     <span className="ml-2">
                                        · Tenggat:{" "}
                                        {new Date(finding.due_date).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                                     </span>
                                  )}
                               </p>
                               {isOverdue(finding.due_date, finding.status) && (
                                  <Badge variant="outline" className="bg-red-100 text-destructive border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800 w-fit">
                                     Terlambat
                                  </Badge>
                               )}
                           </div>
                            <Badge
                               variant="outline"
                               className={severityClass(finding.severity)}
                            >
                               {severityLabel(finding.severity)}
                            </Badge>
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
                        </div>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <p className="text-sm text-foreground">
                           {finding.deskripsi}
                        </p>
                        <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                           <div className="font-medium text-foreground">
                              Klarifikasi sebelumnya
                           </div>
                           {finding.finding_clarifications?.length ? (
                              <ul className="mt-2 space-y-2">
                                 {finding.finding_clarifications.map(
                                    (clarification) => (
                                       <li
                                          key={clarification.id}
                                          className="rounded-md border border-border bg-card px-3 py-2"
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
                                                 <span className="font-medium text-foreground">
                                                    {formatDecisionLabel(
                                                       clarification.decision,
                                                    )}
                                                 </span>
                                              </div>
                                             <span className="text-xs text-muted-foreground">
                                                {formatDateTime(
                                                   clarification.created_at,
                                                )}
                                             </span>
                                          </div>
                                           <p className="mt-1 text-sm text-muted-foreground">
                                              {clarification.message}
                                           </p>
                                           {clarification.evidence &&
                                           typeof clarification.evidence ===
                                              "object" &&
                                           clarification.evidence !== null ? (
                                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                                 {"link" in clarification.evidence &&
                                                 typeof clarification.evidence.link === "string" ? (
                                                    <a
                                                       href={clarification.evidence.link}
                                                       target="_blank"
                                                       rel="noreferrer"
                                                       className="text-primary underline underline-offset-2"
                                                    >
                                                       {clarification.evidence.link}
                                                    </a>
                                                 ) : null}
                                                 {"file_path" in clarification.evidence &&
                                                 typeof clarification.evidence.file_path === "string" ? (
                                                    <button
                                                       onClick={() => downloadEvidence(clarification.evidence!.file_path as string)}
                                                       className="inline-flex items-center gap-1 text-primary hover:underline"
                                                    >
                                                       <Paperclip className="h-3 w-3" />
                                                       {(clarification.evidence.file_name as string) ?? "Lampiran"}
                                                    </button>
                                                 ) : null}
                                              </div>
                                           ) : null}
                                       </li>
                                    ),
                                 )}
                              </ul>
                           ) : (
                              <p className="mt-2 text-sm text-muted-foreground">
                                 Belum ada klarifikasi.
                              </p>
                           )}
                         </div>

                         {finding.finding_actions && finding.finding_actions.length > 0 && (
                            <div className="rounded-lg border border-border bg-card p-3">
                               <div className="text-sm font-medium text-foreground mb-2">
                                  Tindak Lanjut Staf IW
                               </div>
                               <ul className="space-y-1.5">
                                  {finding.finding_actions.map((action) => (
                                     <li key={action.id} className="flex items-start gap-2">
                                        {action.status === "done" ? (
                                           <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                                        ) : (
                                           <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                           <span className={`text-sm ${action.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                              {action.action_text}
                                           </span>
                                           <p className="text-[10px] text-muted-foreground mt-0.5">
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
                           <ClarificationForm findingId={finding.id} />
                        ) : (
                           <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:border-green-800 dark:bg-green-950/50 px-3 py-2 text-sm text-brand-green">
                              Temuan ini sudah ditutup oleh Staf IW.
                           </div>
                        )}
                      </CardContent>
                   </Card>
                 ))
                 )}
                 {visibleCount < filteredFindings.length && (
                    <div className="flex justify-center pt-2">
                       <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVisibleCount((count) => count + FINDINGS_PAGE_SIZE)}
                       >
                          Tampilkan Lebih Banyak ({filteredFindings.length - visibleCount} lagi)
                       </Button>
                    </div>
                 )}
              </div>
           )}
      </div>
   );
}
