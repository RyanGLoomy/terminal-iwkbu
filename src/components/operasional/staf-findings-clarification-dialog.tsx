"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
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
import {
   AlertCircle,
   CheckCircle2,
   Circle,
   Loader2,
   MessageSquare,
   Paperclip,
   Plus,
} from "lucide-react";
import { getErrorMessage } from "@/lib/db-error";
import { formatDecisionLabel, formatDateTime } from "./findings-shared";
import { EvidenceAttachment } from "./evidence-attachment";

async function downloadEvidence(filePath: string) {
   try {
      const res = await fetch(
         `/api/findings/evidence?path=${encodeURIComponent(filePath)}`,
      );
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
   } catch {
      toast.error("Gagal mengunduh file");
   }
}

export function StafFindingsClarificationDialog({
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
   const [clarificationDecision, setClarificationDecision] =
      useState("melengkapi");
   const [clarificationMessage, setClarificationMessage] = useState("");
   const [clarificationEvidenceLink, setClarificationEvidenceLink] =
      useState("");
   const [clarificationFile, setClarificationFile] = useState<File | null>(
      null,
   );
   const [clarificationSaving, setClarificationSaving] = useState(false);
   const [actionText, setActionText] = useState("");
   const [actionSaving, setActionSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const prevOpenRef = useRef(false);

   useEffect(() => {
      if (open && !prevOpenRef.current && finding) {
         setClarificationDecision("melengkapi");
         setClarificationMessage("");
         setClarificationEvidenceLink("");
         setClarificationFile(null);
         setError(null);
      }
      prevOpenRef.current = open;
   }, [open, finding]);

   const submitClarification = async () => {
      if (!finding) return;
      if (!clarificationMessage.trim()) {
         setError("Pesan klarifikasi wajib diisi");
         return;
      }

      setClarificationSaving(true);
      setError(null);

      try {
         const formData = new FormData();
         formData.append("decision", clarificationDecision);
         formData.append("message", clarificationMessage);
         if (clarificationEvidenceLink)
            formData.append("evidenceLink", clarificationEvidenceLink);
         if (clarificationFile)
            formData.append("evidenceFile", clarificationFile);

         const response = await fetch(
            `/api/staf-iw/findings/${finding.id}/clarifications`,
            {
               method: "POST",
               body: formData,
            },
         );

         const payload = await response.json();
         if (!response.ok) {
            throw new Error(
               payload.message ?? "Gagal mengirim klarifikasi",
            );
         }

         toast.success("Klarifikasi berhasil dikirim");
         onClose();
         onChanged();
      } catch (err: unknown) {
         setError(getErrorMessage(err));
      } finally {
         setClarificationSaving(false);
      }
   };

   const addAction = async () => {
      if (!finding) return;
      if (!actionText.trim()) return;

      setActionSaving(true);
      setError(null);

      try {
         const response = await fetch(
            `/api/staf-iw/findings/${finding.id}/actions`,
            {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ actionText: actionText.trim() }),
            },
         );

         const payload = await response.json();
         if (!response.ok) {
            throw new Error(payload.message ?? "Gagal menambah tindakan");
         }

         setActionText("");
         toast.success("Tindakan berhasil ditambahkan");
         onChanged();
      } catch (err: unknown) {
         setError(getErrorMessage(err));
      } finally {
         setActionSaving(false);
      }
   };

   const toggleAction = async (actionId: string, currentStatus: string) => {
      if (!finding) return;
      const newStatus = currentStatus === "done" ? "open" : "done";

      try {
         const response = await fetch(
            `/api/staf-iw/findings/${finding.id}/actions/${actionId}`,
            {
               method: "PATCH",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ status: newStatus }),
            },
         );

         const payload = await response.json();
         if (!response.ok) {
            throw new Error(payload.message ?? "Gagal mengubah status tindakan");
         }

         toast.success(
            newStatus === "done"
               ? "Tindakan ditandai selesai"
               : "Tindakan dibuka kembali",
         );
         onChanged();
      } catch (err: unknown) {
         toast.error(getErrorMessage(err));
      }
   };

   return (
      <Dialog
         open={open}
         onOpenChange={(next) => {
            if (!next) onClose();
         }}
      >
         <DialogContent className="max-w-lg">
            <DialogHeader>
               <DialogTitle>Klarifikasi Temuan</DialogTitle>
               <DialogDescription>
                  {finding?.nomor_polisi} — {finding?.judul}
               </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
               {finding?.finding_clarifications?.length ? (
                  <ul className="max-h-[240px] space-y-2 overflow-y-auto">
                     {finding.finding_clarifications.map((c) => (
                        <li
                           key={c.id}
                           className="rounded-md border border-base-300 bg-base-100 px-3 py-2"
                        >
                           <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                 <Badge
                                    variant="outline"
                                    className={
                                       c.responder_role === "po"
                                          ? "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800"
                                          : "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800"
                                    }
                                 >
                                    {c.responder_role === "po"
                                       ? "PO"
                                       : "Staf IW"}
                                 </Badge>
                                 <span className="text-sm font-medium text-base-content">
                                    {formatDecisionLabel(c.decision)}
                                 </span>
                              </div>
                              <span className="text-xs text-base-content/70">
                                 {formatDateTime(c.created_at)}
                              </span>
                           </div>
                           <p className="mt-1 text-sm text-base-content/70">
                              {c.message}
                           </p>
                            {c.evidence &&
                            typeof c.evidence === "object" &&
                            c.evidence !== null ? (
                               <EvidenceAttachment evidence={c.evidence as Record<string, unknown>} />
                            ) : null}
                        </li>
                     ))}
                  </ul>
               ) : (
                  <p className="text-sm text-base-content/70">
                     Belum ada klarifikasi untuk temuan ini.
                  </p>
               )}
            </div>

            {finding?.status !== "closed" ? (
               <div className="space-y-3 rounded-lg border border-base-300 bg-base-200/50 p-3">
                  <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                     <Select
                        value={clarificationDecision}
                        onValueChange={setClarificationDecision}
                     >
                        <SelectTrigger className="h-10 rounded-md border border-base-300 bg-base-100 px-3 text-sm">
                           <SelectValue placeholder="Pilih keputusan" />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="melengkapi">
                              Melengkapi Bukti
                           </SelectItem>
                           <SelectItem value="menerima">Menerima</SelectItem>
                           <SelectItem value="menolak">Menolak</SelectItem>
                        </SelectContent>
                     </Select>
                     <Textarea
                        value={clarificationMessage}
                        onChange={(e) =>
                           setClarificationMessage(e.target.value)
                        }
                        placeholder="Tulis klarifikasi atau alasan singkat"
                     />
                  </div>
                  <Input
                     value={clarificationEvidenceLink}
                     onChange={(e) =>
                        setClarificationEvidenceLink(e.target.value)
                     }
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
                           onChange={(e) =>
                              setClarificationFile(e.target.files?.[0] ?? null)
                           }
                           className="sr-only"
                        />
                     </label>
                     {clarificationFile && (
                        <span className="text-xs text-base-content/70 tabular-nums">
                           {clarificationFile.name} (
                           {(clarificationFile.size / 1024).toFixed(0)}
                           &nbsp;KB)
                        </span>
                     )}
                  </div>
                  <Button
                     size="sm"
                     onClick={submitClarification}
                     disabled={clarificationSaving}
                  >
                     {clarificationSaving ? (
                        <Loader2
                           className="mr-2 h-4 w-4 animate-spin"
                           aria-hidden="true"
                        />
                     ) : (
                        <MessageSquare
                           className="mr-2 h-4 w-4"
                           aria-hidden="true"
                        />
                     )}
                     Kirim Klarifikasi
                  </Button>
               </div>
            ) : (
               <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:border-green-800 dark:bg-green-950/50 px-3 py-2 text-sm text-brand-green">
                  Temuan ini sudah ditutup.
               </div>
            )}

            <div className="space-y-2 rounded-lg border border-base-300 bg-base-100 p-3">
               <div className="text-sm font-medium text-base-content">
                  Tindak Lanjut
               </div>
               {finding?.finding_actions?.length ? (
                  <ul className="space-y-1.5">
                     {finding.finding_actions.map((action) => (
                        <li key={action.id} className="flex items-start gap-2">
                           <button
                              onClick={() =>
                                 toggleAction(action.id, action.status)
                              }
                              className="mt-0.5 shrink-0"
                           >
                              {action.status === "done" ? (
                                 <CheckCircle2 className="h-4 w-4 text-brand-green" />
                              ) : (
                                 <Circle className="h-4 w-4 text-base-content/70" />
                              )}
                           </button>
                           <div className="flex-1 min-w-0">
                              <span
                                 className={`text-sm ${
                                    action.status === "done"
                                       ? "text-base-content/70 line-through"
                                       : "text-base-content"
                                 }`}
                              >
                                 {action.action_text}
                              </span>
                              <p className="text-[10px] text-base-content/70 mt-0.5">
                                 {new Date(action.created_at).toLocaleString(
                                    "id-ID",
                                    {
                                       day: "2-digit",
                                       month: "short",
                                       hour: "2-digit",
                                       minute: "2-digit",
                                    },
                                 )}
                                 {action.status === "done" &&
                                    action.done_at &&
                                    ` — selesai ${new Date(
                                       action.done_at,
                                    ).toLocaleString("id-ID", {
                                       day: "2-digit",
                                       month: "short",
                                       hour: "2-digit",
                                       minute: "2-digit",
                                    })}`}
                              </p>
                           </div>
                        </li>
                     ))}
                  </ul>
               ) : (
                  <p className="text-xs text-base-content/70">
                     Belum ada tindakan.
                  </p>
               )}
               {finding?.status !== "closed" && (
                  <div className="flex gap-2">
                     <Input
                        value={actionText}
                        onChange={(e) => setActionText(e.target.value)}
                        placeholder="Tambah tindakan..."
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                           if (e.key === "Enter") {
                              e.preventDefault();
                              addAction();
                           }
                        }}
                     />
                     <Button
                        size="sm"
                        variant="outline"
                        className="h-8 shrink-0 px-2"
                        onClick={addAction}
                        disabled={actionSaving || !actionText.trim()}
                     >
                        {actionSaving ? (
                           <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                           <Plus className="h-3.5 w-3.5" />
                        )}
                     </Button>
                  </div>
               )}
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
         </DialogContent>
      </Dialog>
   );
}
