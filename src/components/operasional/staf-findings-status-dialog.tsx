"use client";

import { useEffect, useRef, useState } from "react";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
   FindingRecord,
   FindingStatus,
} from "@/lib/supabase/queries/operasional.types";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/db-error";

export function StafFindingsStatusDialog({
   open,
   finding,
   targetStatus,
   onClose,
   onChanged,
}: {
   open: boolean;
   finding: FindingRecord | null;
   targetStatus: FindingStatus;
   onClose: () => void;
   onChanged: () => void;
}) {
   const [resolutionNote, setResolutionNote] = useState("");
   const [statusSaving, setStatusSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const prevOpenRef = useRef(false);

   useEffect(() => {
      if (open && !prevOpenRef.current && finding) {
         setResolutionNote(finding.resolution_note ?? "");
         setError(null);
      }
      prevOpenRef.current = open;
   }, [open, finding]);

   const submit = async () => {
      if (!finding) return;

      if (targetStatus === "closed" && !resolutionNote.trim()) {
         setError("Catatan penyelesaian wajib diisi saat menutup temuan");
         return;
      }

      setStatusSaving(true);
      setError(null);

      try {
         const response = await fetch(`/api/staf-iw/findings/${finding.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               status: targetStatus,
               resolutionNote: resolutionNote.trim() || undefined,
            }),
         });

         const payload = await response.json();
         if (!response.ok) {
            throw new Error(payload.message ?? "Gagal memperbarui temuan");
         }

         toast.success("Status temuan berhasil diperbarui");
         onClose();
         onChanged();
      } catch (err: unknown) {
         setError(getErrorMessage(err));
      } finally {
         setStatusSaving(false);
      }
   };

   return (
      <Dialog
         open={open}
         onOpenChange={(next) => {
            if (!next) onClose();
         }}
      >
         <DialogContent>
            <DialogHeader>
               <DialogTitle>
                  {targetStatus === "closed"
                     ? "Tutup Temuan"
                     : "Ubah Status Temuan"}
               </DialogTitle>
               <DialogDescription>
                  {finding?.nomor_polisi} - {finding?.judul}
               </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
               <label className="text-sm font-medium text-base-content">
                  Catatan penyelesaian
                  {targetStatus === "closed" ? " *" : ""}
               </label>
               <Textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Jelaskan tindak lanjut, alasan penutupan, atau hasil klarifikasi"
                  rows={4}
               />
               <p className="text-xs text-base-content/70">
                  Catatan ini akan tersimpan di hasil temuan dan membantu audit trail tindak lanjut.
               </p>
            </div>

            {error && (
               <div
                  className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-3 py-2 text-sm text-error"
                  role="alert"
                  aria-live="polite"
               >
                  <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                  <span>{error}</span>
               </div>
            )}

            <DialogFooter>
               <Button variant="outline" onClick={onClose}>
                  Batal
               </Button>
               <Button onClick={submit} disabled={statusSaving}>
                  {statusSaving ? "Menyimpan…" : "Simpan Status"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
