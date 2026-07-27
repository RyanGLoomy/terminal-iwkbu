"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/db-error";
import type {
   FindingRecord,
   FindingStatus,
} from "@/lib/supabase/queries/operasional.types";
import { IconPencil, IconMessage, IconRefresh } from "@tabler/icons-react";

const StafFindingsStatusDialog = dynamic(() =>
   import("./staf-findings-status-dialog").then((m) => ({ default: m.StafFindingsStatusDialog })),
);
const StafFindingsClarificationDialog = dynamic(() =>
   import("./staf-findings-clarification-dialog").then((m) => ({ default: m.StafFindingsClarificationDialog })),
);
const StafFindingsEditDialog = dynamic(() =>
   import("./staf-findings-edit-dialog").then((m) => ({ default: m.StafFindingsEditDialog })),
);

/**
 * Aksi Staf IW di halaman detail temuan: edit, ubah status, buka ulang,
 * kelola klarifikasi. Memakai dialog yang sama dengan daftar lama (Phase 1).
 */
export function StafFindingDetailActions({ finding }: { finding: FindingRecord }) {
   const router = useRouter();
   const [statusDialog, setStatusDialog] = useState<{
      finding: FindingRecord | null;
      target: FindingStatus;
   }>({ finding: null, target: "open" });
   const [editFinding, setEditFinding] = useState<FindingRecord | null>(null);
   const [clarificationFinding, setClarificationFinding] = useState<FindingRecord | null>(null);

   async function reopenFinding(findingId: string) {
      try {
         const res = await fetch(`/api/staf-iw/findings/${findingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "open" }),
         });
         const payload = await res.json();
         if (!res.ok) throw new Error(payload.message ?? "Gagal membuka ulang temuan");
         toast.success("Temuan dibuka kembali");
         router.refresh();
      } catch (err: unknown) {
         toast.error(getErrorMessage(err));
      }
   }

   const closed = finding.status === "closed";

   return (
      <div className="flex flex-wrap items-center gap-2">
         <Button
            size="sm"
            variant="ghost"
            onClick={() => setClarificationFinding(finding)}
         >
            <IconMessage className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Kelola Klarifikasi
         </Button>
         <div className="flex-1" />
         {!closed && (
            <>
               <Button size="sm" variant="ghost" onClick={() => setEditFinding(finding)}>
                  <IconPencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
               </Button>
               <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStatusDialog({ finding, target: "on_progress" })}
               >
                  On Progress
               </Button>
               <Button
                  size="sm"
                  onClick={() => setStatusDialog({ finding, target: "closed" })}
               >
                  Close
               </Button>
            </>
         )}
         {closed && (
            <Button size="sm" variant="outline" onClick={() => reopenFinding(finding.id)}>
               <IconRefresh className="h-3.5 w-3.5" aria-hidden="true" />
               Buka Ulang
            </Button>
         )}

         <StafFindingsStatusDialog
            open={!!statusDialog.finding}
            finding={statusDialog.finding}
            targetStatus={statusDialog.target}
            onClose={() => setStatusDialog({ finding: null, target: "open" })}
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
      </div>
   );
}
