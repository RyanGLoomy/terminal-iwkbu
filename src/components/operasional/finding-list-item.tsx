import Link from "next/link";
import { formatDateTime } from "@/lib/utils/format-date";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { getDueDateBadge } from "./findings-shared";
import { FindingTurnBadge } from "./finding-turn-badge";
import type { FindingRecord } from "@/lib/supabase/queries/operasional.types";
import { ChevronRight } from "lucide-react";

function latestSnippet(finding: FindingRecord): string | null {
   const candidates: { ts: string; text: string }[] = [];
   for (const c of finding.finding_clarifications ?? []) {
      candidates.push({
         ts: c.created_at,
         text: `${c.responder_role === "po" ? "PO" : "Staf IW"}: ${c.message}`,
      });
   }
   for (const a of finding.finding_actions ?? []) {
      candidates.push({
         ts: a.created_at,
         text: `Staf IW tindakan: ${a.action_text}`,
      });
   }
   if (candidates.length === 0) return null;
   const latest = candidates.reduce((acc, c) => (c.ts > acc.ts ? c : acc), candidates[0]);
   const text = latest.text.replace(/\s+/g, " ").trim();
   return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

/**
 * Kartu ringkas konsisten untuk daftar temuan PO & Staf IW. Seluruh kartu
 * adalah Link ke halaman detail temuan.
 */
export function FindingListItem({
   finding,
   href,
}: {
   finding: FindingRecord;
   href: string;
}) {
   const dueBadge = getDueDateBadge(finding.due_date, finding.status);
   const snippet = latestSnippet(finding);

   return (
      <Link
         href={href}
         className="group flex items-start gap-3 rounded-xl border border-base-300 bg-base-100 p-3.5 transition-colors hover:bg-base-200/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
         <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
               <p className="line-clamp-1 font-medium text-base-content">
                  {finding.judul}
               </p>
               <ChevronRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-base-content/40 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
               />
            </div>
            <p className="truncate text-xs text-base-content/60">
               {finding.po?.nama_perusahaan ?? finding.po?.kode_po ?? "-"}
               {" · "}
               {finding.nomor_polisi}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
               <StatusBadge category="severity" value={finding.severity} />
               <StatusBadge category="finding" value={finding.status} />
               <FindingTurnBadge finding={finding} />
               {dueBadge && (
                  <Badge variant="outline" className={`text-[11px] ${dueBadge.color}`}>
                     {dueBadge.label}
                  </Badge>
               )}
            </div>
            {snippet && (
               <p className="line-clamp-1 text-xs text-base-content/50">{snippet}</p>
            )}
            <p className="text-[11px] text-base-content/40">
               {formatDateTime(finding.created_at)}
            </p>
         </div>
      </Link>
   );
}
