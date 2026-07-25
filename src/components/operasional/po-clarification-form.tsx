"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Loader2, MessageSquare, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/db-error";

export function PoClarificationForm({ findingId }: { findingId: string }) {
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
      } catch (err: unknown) {
         setError(getErrorMessage(err));
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="space-y-3 rounded-lg border border-base-300 bg-base-200/50 p-3">
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
            <label className="inline-flex items-center gap-2 rounded-md bg-base-200 px-3 py-1 text-xs font-medium text-base-content hover:bg-base-300/70 cursor-pointer">
               <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
               Pilih file
               <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  aria-label="Unggah bukti klarifikasi"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
               />
            </label>
            {evidenceFile && (
               <span className="text-xs text-base-content/70 tabular-nums">
                  {evidenceFile.name} ({(evidenceFile.size / 1024).toFixed(0)}&nbsp;KB)
               </span>
            )}
         </div>
         {error && (
            <div className="flex items-start gap-2 text-sm text-error" role="alert" aria-live="polite">
               <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
               <span>{error}</span>
            </div>
         )}
         <Button size="sm" onClick={submit} disabled={loading}>
            {loading ? (
               <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
               <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Kirim Klarifikasi
         </Button>
      </div>
   );
}
