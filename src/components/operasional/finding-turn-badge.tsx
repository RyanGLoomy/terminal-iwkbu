import { Badge } from "@/components/ui/badge";
import type { FindingRecord } from "@/lib/supabase/queries/operasional.types";

type Turn = {
   label: string;
   className: string;
};

/**
 * Indikator "giliran" derived murni dari data finding (tanpa kolom DB baru).
 * - closed -> Selesai
 * - event terakhir (klarifikasi/tindakan) oleh PO -> Menunggu tindakan Staf IW
 * - event terakhir oleh Staf IW / belum ada -> Menunggu respons PO
 */
export function deriveTurn(finding: FindingRecord): Turn {
   if (finding.status === "closed") {
      return { label: "Selesai", className: "bg-success/15 text-success border-success/30" };
   }

   const events: { ts: string; actor: "po" | "staf-iw" }[] = [];
   for (const c of finding.finding_clarifications ?? []) {
      events.push({
         ts: c.created_at,
         actor: c.responder_role === "po" ? "po" : "staf-iw",
      });
   }
   for (const a of finding.finding_actions ?? []) {
      // tindak lanjut selalu dibuat Staf IW
      events.push({ ts: a.created_at, actor: "staf-iw" });
      if (a.status === "done" && a.done_at) {
         events.push({ ts: a.done_at, actor: "staf-iw" });
      }
   }

    if (events.length === 0) {
      return { label: "Menunggu respons PO pertama", className: "bg-primary/10 text-primary border-primary/30" };
   }

   const latest = events.reduce((acc, e) => (e.ts > acc.ts ? e : acc), events[0]);

   if (latest.actor === "po") {
      return {
         label: "Menunggu tindakan Staf IW",
         className: "bg-warning/15 text-warning border-warning/30",
      };
   }
   return { label: "Menunggu respons PO", className: "bg-primary/10 text-primary border-primary/30" };
}

export function FindingTurnBadge({ finding }: { finding: FindingRecord }) {
   const turn = deriveTurn(finding);
   return (
      <Badge variant="outline" className={`text-[11px] ${turn.className}`}>
         {turn.label}
      </Badge>
   );
}
