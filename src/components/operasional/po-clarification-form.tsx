"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconAlertCircle, IconLoader2, IconMessage, IconPaperclip } from "@tabler/icons-react";
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

const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function PoClarificationForm({ findingId }: { findingId: string }) {
   const router = useRouter();
   const [decision, setDecision] = useState("melengkapi");
   const [message, setMessage] = useState("");
   const [evidenceLink, setEvidenceLink] = useState("");
   const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const handleFileChange = (file: File | null) => {
      if (file && file.size > MAX_FILE_SIZE_BYTES) {
         setError(`Ukuran file maksimal ${MAX_FILE_SIZE_MB} MB. File Anda: ${(file.size / 1024 / 1024).toFixed(1)} MB`);
         setEvidenceFile(null);
         return;
      }
      setError(null);
      setEvidenceFile(file);
   };

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

         let payload: { message?: string } = {};
         try {
            payload = await response.json();
         } catch {
            if (response.status === 413) {
               throw new Error(`Ukuran file terlalu besar. Maksimal ${MAX_FILE_SIZE_MB} MB.`);
            }
            throw new Error("Gagal mengirim klarifikasi. Coba lagi.");
         }

         if (!response.ok) {
            throw new Error(payload.message ?? "Gagal mengirim klarifikasi");
         }

         setMessage("");
         setEvidenceLink("");
         setEvidenceFile(null);
         toast.success("Klarifikasi berhasil dikirim");
         router.refresh();
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Gagal mengirim klarifikasi");
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
               <IconPaperclip className="h-3.5 w-3.5" aria-hidden="true" />
               Pilih file (maks {MAX_FILE_SIZE_MB} MB)
               <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  aria-label="Unggah bukti klarifikasi"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
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
               <IconAlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
               <span>{error}</span>
            </div>
         )}
         <Button size="sm" onClick={submit} disabled={loading}>
            {loading ? (
               <IconLoader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
               <IconMessage className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Kirim Klarifikasi
         </Button>
      </div>
   );
}
