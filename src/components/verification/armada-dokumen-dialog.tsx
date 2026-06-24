"use client";

import { useState, useEffect, useRef } from "react";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Eye, Paperclip } from "lucide-react";
import { toast } from "sonner";
import type { Armada, ArmadaDokumen } from "@/lib/supabase/queries/verification.types";
import {
   getArmadaDokumen,
   uploadArmadaDokumen,
   deleteArmadaDokumen,
   getArmadaDokumenUrl,
} from "@/lib/supabase/queries/verification.client";

const JENIS_DOKUMEN = [
   { value: "stck" as const, label: "STCK" },
   { value: "kir" as const, label: "KIR" },
   { value: "asuransi" as const, label: "Asuransi" },
];

interface ArmadaDokumenDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   armada: Armada | null;
   poId: string;
}

export function ArmadaDokumenDialog({
   open,
   onOpenChange,
   armada,
   poId,
}: ArmadaDokumenDialogProps) {
   const [dokumen, setDokumen] = useState<ArmadaDokumen[]>([]);
   const [loading, setLoading] = useState(false);
   const [uploading, setUploading] = useState<string | null>(null);
   const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

   useEffect(() => {
      if (open && armada) {
         loadDokumen(armada.id);
      }
   }, [open, armada]);

   async function loadDokumen(armadaId: string) {
      setLoading(true);
      try {
         const data = await getArmadaDokumen(armadaId);
         setDokumen(data);
      } catch {
      } finally {
         setLoading(false);
      }
   }

   async function handleUpload(jenis: string) {
      const input = fileInputRefs.current[jenis];
      if (!input?.files?.[0] || !armada) return;

      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
         toast.error("Ukuran file maksimal 5 MB");
         return;
      }

      setUploading(jenis);
      try {
         await uploadArmadaDokumen(
            armada.id,
            poId,
            jenis as ArmadaDokumen["jenis_dokumen"],
            file,
         );
         toast.success("Dokumen berhasil diunggah");
         await loadDokumen(armada.id);
      } catch (error: any) {
         toast.error(error?.message ?? "Gagal mengunggah dokumen");
      } finally {
         setUploading(null);
         input.value = "";
      }
   }

   async function handleDelete(dok: ArmadaDokumen) {
      try {
         await deleteArmadaDokumen(dok.id, dok.file_path);
         toast.success("Dokumen dihapus");
         if (armada) await loadDokumen(armada.id);
      } catch (error: any) {
         toast.error(error?.message ?? "Gagal menghapus dokumen");
      }
   }

   async function handleView(dok: ArmadaDokumen) {
      try {
         const url = await getArmadaDokumenUrl(dok.file_path);
         window.open(url, "_blank");
      } catch (error: any) {
         toast.error(error?.message ?? "Gagal membuka dokumen");
      }
   }

   if (!armada) return null;

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="max-w-lg">
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Dokumen Armada
               </DialogTitle>
               <DialogDescription>
                  {armada.nomor_polisi} &mdash; {armada.merk} {armada.tipe}
               </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
               {JENIS_DOKUMEN.map((jenis) => {
                  const docs = dokumen.filter(
                     (d) => d.jenis_dokumen === jenis.value,
                  );
                  return (
                     <div key={jenis.value} className="space-y-2">
                        <div className="flex items-center justify-between">
                           <label className="text-sm font-medium">
                              {jenis.label}
                           </label>
                           <input
                              ref={(el) => {
                                 fileInputRefs.current[jenis.value] = el;
                              }}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              className="hidden"
                              onChange={() => handleUpload(jenis.value)}
                           />
                           <Button
                              size="sm"
                              variant="outline"
                              disabled={uploading === jenis.value}
                              onClick={() =>
                                 fileInputRefs.current[jenis.value]?.click()
                              }
                           >
                              {uploading === jenis.value ? (
                                 "Mengunggah..."
                              ) : (
                                 <>
                                    <Upload className="h-3.5 w-3.5 mr-1" />
                                    Upload
                                 </>
                              )}
                           </Button>
                        </div>
                        {docs.length > 0 && (
                           <div className="space-y-1">
                              {docs.map((dok) => (
                                 <div
                                    key={dok.id}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                                 >
                                    <div className="flex items-center gap-2 min-w-0">
                                       <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                       <div className="min-w-0">
                                          <p className="text-sm truncate">
                                             {dok.file_name}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                             {dok.file_size
                                                ? `${(dok.file_size / 1024).toFixed(0)} KB`
                                                : ""}
                                             {" · "}
                                             {new Date(
                                                dok.created_at,
                                             ).toLocaleDateString("id-ID")}
                                          </p>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                       <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleView(dok)}
                                       >
                                          <Eye className="h-3.5 w-3.5" />
                                       </Button>
                                       <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleDelete(dok)}
                                       >
                                          <Trash2 className="h-3.5 w-3.5" />
                                       </Button>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  );
               })}

               {loading && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                     Memuat dokumen...
                  </p>
               )}

               {!loading && dokumen.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                     Belum ada dokumen diunggah
                  </p>
               )}
            </div>
         </DialogContent>
      </Dialog>
   );
}
