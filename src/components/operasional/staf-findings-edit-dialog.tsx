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
import { Input } from "@/components/ui/input";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FindingRecord } from "@/lib/supabase/queries/operasional.types";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/db-error";

export function StafFindingsEditDialog({
   open,
   finding,
   onClose,
   onChanged,
}: {
   open: boolean;
   finding: FindingRecord | null;
   onClose: () => void;
   onChanged: () => void;
}) {
   const [editForm, setEditForm] = useState({
      judul: "",
      deskripsi: "",
      severity: "medium",
      dueDate: "",
   });
   const [editSaving, setEditSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const prevOpenRef = useRef(false);

   useEffect(() => {
      if (open && !prevOpenRef.current && finding) {
         setEditForm({
            judul: finding.judul,
            deskripsi: finding.deskripsi ?? "",
            severity: finding.severity,
            dueDate: finding.due_date ?? "",
         });
         setError(null);
      }
      prevOpenRef.current = open;
   }, [open, finding]);

   const submit = async () => {
      if (!finding) return;
      if (!editForm.judul.trim()) {
         setError("Judul wajib diisi");
         return;
      }

      setEditSaving(true);
      setError(null);

      try {
         const response = await fetch(`/api/staf-iw/findings/${finding.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               judul: editForm.judul.trim(),
               deskripsi: editForm.deskripsi.trim(),
               severity: editForm.severity,
               dueDate: editForm.dueDate || null,
            }),
         });

         const payload = await response.json();
         if (!response.ok) {
            throw new Error(payload.message ?? "Gagal memperbarui temuan");
         }

         toast.success("Temuan berhasil diperbarui");
         onClose();
         onChanged();
      } catch (err: unknown) {
         setError(getErrorMessage(err));
      } finally {
         setEditSaving(false);
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
               <DialogTitle>Edit Temuan</DialogTitle>
               <DialogDescription>
                  {finding?.nomor_polisi} —{" "}
                  {finding?.po?.nama_perusahaan ?? finding?.po_id}
               </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
               <div className="space-y-1.5">
                  <label className="text-sm font-medium text-base-content">
                     Judul *
                  </label>
                  <Input
                     value={editForm.judul}
                     onChange={(e) =>
                        setEditForm((f) => ({ ...f, judul: e.target.value }))
                     }
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="text-sm font-medium text-base-content">
                     Deskripsi
                  </label>
                  <Textarea
                     value={editForm.deskripsi}
                     onChange={(e) =>
                        setEditForm((f) => ({
                           ...f,
                           deskripsi: e.target.value,
                        }))
                     }
                     rows={4}
                  />
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium text-base-content">
                        Severity
                     </label>
                     <Select
                        value={editForm.severity}
                        onValueChange={(v) =>
                           setEditForm((f) => ({ ...f, severity: v }))
                        }
                     >
                        <SelectTrigger className="h-9 w-full rounded-lg border border-base-300 bg-base-100 px-3 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring/30">
                           <SelectValue placeholder="Pilih Severity" />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="low">Rendah</SelectItem>
                           <SelectItem value="medium">Sedang</SelectItem>
                           <SelectItem value="high">Tinggi</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium text-base-content">
                        Tenggat
                     </label>
                     <Input
                        type="date"
                        value={editForm.dueDate}
                        onChange={(e) =>
                           setEditForm((f) => ({ ...f, dueDate: e.target.value }))
                        }
                     />
                  </div>
               </div>
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
               <Button onClick={submit} disabled={editSaving}>
                  {editSaving ? (
                     <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden="true"
                     />
                  ) : null}
                  Simpan Perubahan
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
