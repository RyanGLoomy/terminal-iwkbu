import { formatDateTime, formatDate } from "@/lib/utils/format-date";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { FindingTurnBadge } from "./finding-turn-badge";
import { getDueDateBadge } from "./findings-shared";
import type { FindingRecord } from "@/lib/supabase/queries/operasional.types";

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

export function FindingDetailHeader({ finding }: { finding: FindingRecord }) {
   const dueBadge = getDueDateBadge(finding.due_date, finding.status);
   return (
      <div className="space-y-4">
         <div className="space-y-2">
            <h1 className="text-xl font-bold leading-snug tracking-tight text-base-content">
               {finding.judul}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
               <StatusBadge category="severity" value={finding.severity} />
               <StatusBadge category="finding" value={finding.status} />
               <FindingTurnBadge finding={finding} />
               {dueBadge && (
                  <Badge variant="outline" className={`text-[11px] ${dueBadge.color}`}>
                     {dueBadge.label}
                  </Badge>
               )}
            </div>
         </div>

         <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <Meta
               label="PO"
               value={finding.po?.nama_perusahaan ?? finding.po?.kode_po ?? finding.po_id}
            />
            <Meta label="No. Polisi" value={finding.nomor_polisi} />
            <Meta
               label="Armada"
               value={
                  finding.armada
                     ? `${finding.armada.nomor_polisi}${
                          finding.armada.nomor_lambung ? ` · ${finding.armada.nomor_lambung}` : ""
                       }`
                     : "-"
               }
            />
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
         </dl>

         <section>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-base-content/60">
               Deskripsi
            </h2>
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
      </div>
   );
}
