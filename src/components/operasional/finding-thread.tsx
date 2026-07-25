import { formatDateTime } from "@/lib/utils/format-date";
import { Badge } from "@/components/ui/badge";
import { EvidenceAttachment } from "./evidence-attachment";
import { formatDecisionLabel } from "./findings-shared";
import type {
   FindingClarification,
   FindingAction,
   FindingRecord,
} from "@/lib/supabase/queries/operasional.types";
import { CheckCircle2, MessageSquare, Flag } from "lucide-react";

type ThreadEvent =
   | { kind: "clarification"; ts: string; data: FindingClarification }
   | { kind: "action"; ts: string; data: FindingAction };

/**
 * Timeline kronologis satu kolom: klarifikasi (PO & Staf IW) + tindak lanjut
 * (Staf IW) diurutkan naik (terlama di atas, seperti percakapan). Dipakai
 * konsisten di halaman detail PO & Staf IW.
 */
export function FindingThread({ finding }: { finding: FindingRecord }) {
   const events: ThreadEvent[] = [
      ...(finding.finding_clarifications ?? []).map(
         (c) => ({ kind: "clarification" as const, ts: c.created_at, data: c }),
      ),
      ...(finding.finding_actions ?? []).map((a) => {
         // tampilkan tindakan pada saat dibuat; jika sudah done, tandai di kartu.
         return { kind: "action" as const, ts: a.created_at, data: a };
      }),
   ].sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));

   if (events.length === 0) {
      return (
         <p className="rounded-lg border border-dashed border-base-300 bg-base-200/40 p-4 text-center text-sm text-base-content/60">
            Belum ada aktivitas. Percakapan klarifikasi & tindak lanjut akan
            muncul di sini.
         </p>
      );
   }

   return (
      <ol className="space-y-3">
         {events.map((e, i) => (
            <li key={`${e.kind}-${e.data.id}-${i}`} className="relative">
               {e.kind === "clarification" ? (
                  <ClarificationEvent c={e.data} />
               ) : (
                  <ActionEvent a={e.data} />
               )}
            </li>
         ))}
      </ol>
   );
}

function ActorBadge({ role }: { role: "po" | "staf-iw" }) {
   return (
      <Badge
         variant="outline"
         className={
            role === "po"
               ? "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800"
               : "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800"
         }
      >
         {role === "po" ? "PO" : "Staf IW"}
      </Badge>
   );
}

function ClarificationEvent({ c }: { c: FindingClarification }) {
   return (
      <div className="rounded-lg border border-base-300 bg-base-100 p-3">
         <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
               <MessageSquare className="h-3.5 w-3.5 text-base-content/50" aria-hidden="true" />
               <ActorBadge role={c.responder_role} />
               <span className="text-sm font-medium text-base-content">
                  {formatDecisionLabel(c.decision)}
               </span>
            </div>
            <span className="text-[11px] text-base-content/60">
               {formatDateTime(c.created_at)}
            </span>
         </div>
         <p className="mt-2 whitespace-pre-wrap text-sm text-base-content/80">
            {c.message}
         </p>
         {c.evidence && typeof c.evidence === "object" && c.evidence !== null ? (
            <div className="mt-2">
               <EvidenceAttachment evidence={c.evidence as Record<string, unknown>} />
            </div>
         ) : null}
      </div>
   );
}

function ActionEvent({ a }: { a: FindingAction }) {
   const done = a.status === "done";
   return (
      <div className="rounded-lg border border-base-300 bg-base-200/40 p-3">
         <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
               {done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
               ) : (
                  <Flag className="h-3.5 w-3.5 text-base-content/50" aria-hidden="true" />
               )}
               <ActorBadge role="staf-iw" />
               <span className="text-sm font-medium text-base-content">
                  {done ? "Tindak lanjut selesai" : "Tindak lanjut"}
               </span>
            </div>
            <span className="text-[11px] text-base-content/60">
               {formatDateTime(a.created_at)}
               {done && a.done_at ? ` · selesai ${formatDateTime(a.done_at)}` : ""}
            </span>
         </div>
         <p className={`mt-2 text-sm ${done ? "text-base-content/60 line-through" : "text-base-content/80"}`}>
            {a.action_text}
         </p>
      </div>
   );
}
