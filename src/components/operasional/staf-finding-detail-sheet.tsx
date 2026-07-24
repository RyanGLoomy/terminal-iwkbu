"use client";

import { formatDateTime, formatDate } from "@/lib/utils/format-date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
   Sheet,
   SheetContent,
   SheetHeader,
   SheetTitle,
   SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/status-badge";
import { EvidenceAttachment } from "./evidence-attachment";
import {
   formatDecisionLabel,
   getDueDateBadge,
} from "./findings-shared";
import type {
   FindingRecord,
   FindingStatus,
} from "@/lib/supabase/queries/operasional.types";
import {
   CheckCircle2,
   Circle,
   MessageSquare,
   Pencil,
   RefreshCw,
} from "lucide-react";

interface StafFindingDetailSheetProps {
   finding: FindingRecord | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onEdit: (finding: FindingRecord) => void;
   onStatusChange: (finding: FindingRecord, target: FindingStatus) => void;
   onReopen: (findingId: string) => void;
   onClarify: (finding: FindingRecord) => void;
}

export function StafFindingDetailSheet({
   finding,
   open,
   onOpenChange,
   onEdit,
   onStatusChange,
   onReopen,
   onClarify,
}: StafFindingDetailSheetProps) {
   const dueBadge = finding ? getDueDateBadge(finding.due_date, finding.status) : null;

   return (
      <Sheet open={open} onOpenChange={onOpenChange}>
         <SheetContent
            side="right"
            className="flex w-[34rem] max-w-[92vw] flex-col gap-0 p-0"
         >
            {finding && (
               <>
                  <SheetHeader className="border-b border-base-300 p-5 pr-12">
                     <SheetTitle className="text-base leading-snug">
                        {finding.judul}
                     </SheetTitle>
                     <SheetDescription className="sr-only">
                        Detail temuan
                     </SheetDescription>
                     <div className="flex flex-wrap items-center gap-2 pt-1">
                        <StatusBadge category="severity" value={finding.severity} />
                        <StatusBadge category="finding" value={finding.status} />
                        {dueBadge && (
                           <Badge variant="outline" className={`text-[11px] ${dueBadge.color}`}>
                              {dueBadge.label}
                           </Badge>
                        )}
                     </div>
                  </SheetHeader>

                  <div className="flex-1 overflow-y-auto p-5">
                     <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <Meta label="PO" value={finding.po?.nama_perusahaan ?? finding.po?.kode_po ?? finding.po_id} />
                        <Meta label="No. Polisi" value={finding.nomor_polisi} />
                        <Meta label="Dibuat" value={formatDateTime(finding.created_at)} />
                        <Meta
                           label="Tenggat"
                           value={finding.due_date ? formatDate(finding.due_date) : "-"}
                        />
                        <Meta
                           label="Sumber"
                           value={
                              finding.source_type === "rekonsiliasi"
                                 ? "Rekonsiliasi"
                                 : finding.source_type === "audit"
                                   ? "Audit"
                                   : "Manual"
                           }
                        />
                        <Meta
                           label="Armada"
                           value={
                              finding.armada
                                 ? `${finding.armada.nomor_polisi}${
                                      finding.armada.nomor_lambung
                                         ? ` · ${finding.armada.nomor_lambung}`
                                         : ""
                                   }`
                                 : "-"
                           }
                        />
                     </dl>

                     <section className="mt-5">
                        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-base-content/60">
                           Deskripsi
                        </h3>
                        <p className="whitespace-pre-wrap text-sm text-base-content">
                           {finding.deskripsi || "-"}
                        </p>
                        {finding.resolution_note && (
                           <p className="mt-2 rounded-md border border-base-300 bg-base-200/50 p-2 text-xs text-base-content/70">
                              <span className="font-medium">Catatan penyelesaian:</span>{" "}
                              {finding.resolution_note}
                           </p>
                        )}
                     </section>

                     {/* Riwayat klarifikasi */}
                     <section className="mt-5">
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/60">
                           Riwayat Klarifikasi (
                           {finding.finding_clarifications?.length ?? 0})
                        </h3>
                        {finding.finding_clarifications?.length ? (
                           <ul className="space-y-2">
                              {finding.finding_clarifications.map((c) => (
                                 <li
                                    key={c.id}
                                    className="rounded-md border border-base-300 bg-base-100 p-2.5"
                                 >
                                    <div className="flex items-center justify-between gap-2">
                                       <div className="flex items-center gap-2">
                                          <Badge
                                             variant="outline"
                                             className={
                                                c.responder_role === "po"
                                                   ? "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800"
                                                   : "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800"
                                             }
                                          >
                                             {c.responder_role === "po" ? "PO" : "Staf IW"}
                                          </Badge>
                                          <span className="text-sm font-medium text-base-content">
                                             {formatDecisionLabel(c.decision)}
                                          </span>
                                       </div>
                                       <span className="text-[11px] text-base-content/70">
                                          {formatDateTime(c.created_at)}
                                       </span>
                                    </div>
                                    <p className="mt-1 text-sm text-base-content/80">
                                       {c.message}
                                    </p>
                                    {c.evidence &&
                                    typeof c.evidence === "object" &&
                                    c.evidence !== null ? (
                                       <div className="mt-1.5">
                                          <EvidenceAttachment evidence={c.evidence as Record<string, unknown>} />
                                       </div>
                                    ) : null}
                                 </li>
                              ))}
                           </ul>
                        ) : (
                           <p className="text-sm text-base-content/60">
                              Belum ada klarifikasi.
                           </p>
                        )}
                     </section>

                     {/* Tindak lanjut */}
                     <section className="mt-5">
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/60">
                           Tindak Lanjut ({finding.finding_actions?.length ?? 0})
                        </h3>
                        {finding.finding_actions && finding.finding_actions.length > 0 ? (
                           <ul className="space-y-1.5">
                              {finding.finding_actions.map((a) => (
                                 <li key={a.id} className="flex items-start gap-2">
                                    {a.status === "done" ? (
                                       <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                                    ) : (
                                       <Circle className="mt-0.5 h-4 w-4 shrink-0 text-base-content/60" aria-hidden="true" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                       <span
                                          className={`text-sm ${
                                             a.status === "done"
                                                ? "text-base-content/60 line-through"
                                                : "text-base-content"
                                          }`}
                                       >
                                          {a.action_text}
                                       </span>
                                       <p className="text-[11px] text-base-content/60">
                                          {formatDateTime(a.created_at)}
                                          {a.status === "done" && a.done_at
                                             ? ` — selesai ${formatDateTime(a.done_at)}`
                                             : ""}
                                       </p>
                                    </div>
                                 </li>
                              ))}
                           </ul>
                        ) : (
                           <p className="text-sm text-base-content/60">
                              Belum ada tindak lanjut.
                           </p>
                        )}
                     </section>
                  </div>

                  {/* Action bar */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-base-300 p-4">
                     <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                           onOpenChange(false);
                           onClarify(finding);
                        }}
                     >
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Kelola Klarifikasi
                     </Button>
                     <div className="flex-1" />
                     {finding.status !== "closed" ? (
                        <>
                           <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                 onOpenChange(false);
                                 onEdit(finding);
                              }}
                           >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              Edit
                           </Button>
                           <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                 onOpenChange(false);
                                 onStatusChange(finding, "on_progress");
                              }}
                           >
                              On Progress
                           </Button>
                           <Button
                              size="sm"
                              onClick={() => {
                                 onOpenChange(false);
                                 onStatusChange(finding, "closed");
                              }}
                           >
                              Close
                           </Button>
                        </>
                     ) : (
                        <Button
                           size="sm"
                           variant="outline"
                           onClick={() => {
                              onOpenChange(false);
                              onReopen(finding.id);
                           }}
                        >
                           <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                           Buka Ulang
                        </Button>
                     )}
                  </div>
               </>
            )}
         </SheetContent>
      </Sheet>
   );
}

function Meta({ label, value }: { label: string; value: string }) {
   return (
      <div>
         <dt className="text-[11px] font-medium uppercase tracking-wide text-base-content/50">
            {label}
         </dt>
         <dd className="text-base-content">{value}</dd>
      </div>
   );
}
