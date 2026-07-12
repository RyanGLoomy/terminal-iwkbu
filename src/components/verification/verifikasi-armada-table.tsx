"use client";

import { useState, memo } from "react";
import { useRouter } from "next/navigation";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { verifikasiArmada } from "@/lib/supabase/queries/verification.client";
import type { Armada } from "@/lib/supabase/queries/verification.types";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, XCircle, Bus, FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import dynamic from "next/dynamic";

const ArmadaDokumenDialog = dynamic(() =>
   import("./armada-dokumen-dialog").then((m) => ({ default: m.ArmadaDokumenDialog })),
);

interface VerifikasiArmadaTableProps {
   data: Armada[];
   showActions: boolean;
}

export const VerifikasiArmadaTable = memo(
   function VerifikasiArmadaTableContent({
      data,
      showActions,
   }: VerifikasiArmadaTableProps) {
      const [selectedArmada, setSelectedArmada] = useState<Armada | null>(null);
      const [action, setAction] = useState<"terverifikasi" | "ditolak" | null>(
         null,
      );
      const [keterangan, setKeterangan] = useState("");
       const [loading, setLoading] = useState(false);
       const [error, setError] = useState<string | null>(null);
       const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
       const [bulkLoading, setBulkLoading] = useState(false);
       const [dokumenArmada, setDokumenArmada] = useState<Armada | null>(null);
       const router = useRouter();

      const handleVerifikasi = async () => {
         if (!selectedArmada || !action) return;

         setLoading(true);
         setError(null);
      try {
         await verifikasiArmada(selectedArmada.id, action, keterangan);
         toast.success(
            action === "terverifikasi"
               ? "Armada berhasil diverifikasi"
               : "Armada berhasil ditolak",
         );
         router.refresh();
         setSelectedArmada(null);
         setAction(null);
         setKeterangan("");
      } catch (error) {
            setError(
               error instanceof Error
                  ? error.message
                  : "Gagal memproses verifikasi",
            );
         } finally {
            setLoading(false);
         }
       };

      const handleBulkVerifikasi = async (
         bulkAction: "terverifikasi" | "ditolak",
      ) => {
         if (selectedIds.size === 0) return;
         setBulkLoading(true);
         setError(null);
         const ids = Array.from(selectedIds);
         const results = await Promise.allSettled(
            ids.map((id) =>
               verifikasiArmada(id, bulkAction, ""),
            ),
         );
         const success = results.filter((r) => r.status === "fulfilled").length;
         const failed = results.length - success;
         if (success > 0) {
            toast.success(
               `${success} armada ${bulkAction === "terverifikasi" ? "diverifikasi" : "ditolak"}`,
            );
            router.refresh();
         }
         if (failed > 0) {
            toast.error(`${failed} armada gagal diproses`);
         }
         setSelectedIds(new Set());
         setBulkLoading(false);
      };

      if (data.length === 0) {
         return (
            <div className="space-y-3">
               {error && (
                  <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-3 py-2 text-sm text-error">
                     <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                     <span>{error}</span>
                  </div>
               )}
               <EmptyState title="Tidak ada data armada" icon={Bus} />
            </div>
         );
      }

      return (
         <>
            {error && (
               <div className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-3 py-2 text-sm text-error">
                  <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                  <span>{error}</span>
               </div>
            )}
            <div className="border border-base-300 rounded-lg bg-base-100 overflow-hidden">
                <Table caption="Daftar armada menunggu verifikasi">
                  <TableHeader>
                      <TableRow className="bg-base-200/50">
                         {showActions && (
                            <TableHead className="w-10">
                               <input
                                  type="checkbox"
                                  className="checkbox checkbox-sm"
                                  checked={
                                     selectedIds.size === data.length &&
                                     data.length > 0
                                  }
                                  onChange={(e) => {
                                     setSelectedIds(
                                        e.target.checked
                                           ? new Set(data.map((a) => a.id))
                                           : new Set(),
                                     );
                                  }}
                                  aria-label="Pilih semua"
                               />
                            </TableHead>
                         )}
                         <TableHead className="text-[13px]">
                            No. Polisi
                         </TableHead>
                        <TableHead className="text-[13px]">Merk/Tipe</TableHead>
                        <TableHead className="text-[13px]">PO</TableHead>
                        <TableHead className="text-[13px]">
                           Status Operasional
                        </TableHead>
                        <TableHead className="text-[13px]">
                           Status Verifikasi
                        </TableHead>
                         <TableHead className="text-right text-[13px]">
                               Aksi
                         </TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {data.map((armada) => (
                         <TableRow key={armada.id}>
                            {showActions && (
                               <TableCell className="w-10">
                                  <input
                                     type="checkbox"
                                     className="checkbox checkbox-sm"
                                     checked={selectedIds.has(armada.id)}
                                     onChange={(e) => {
                                        setSelectedIds((prev) => {
                                           const next = new Set(prev);
                                           if (e.target.checked)
                                              next.add(armada.id);
                                           else next.delete(armada.id);
                                           return next;
                                        });
                                     }}
                                     aria-label={`Pilih ${armada.nomor_polisi}`}
                                  />
                               </TableCell>
                            )}
                            <TableCell className="font-medium">
                               {armada.nomor_polisi}
                            </TableCell>
                           <TableCell>
                              {armada.merk} {armada.tipe}
                           </TableCell>
                           <TableCell>
                              <div className="text-sm">
                                 <div>{armada.po?.nama_perusahaan || "-"}</div>
                                 <div className="text-base-content/70">
                                    {armada.po?.kode_po || "-"}
                                 </div>
                              </div>
                           </TableCell>
                           <TableCell>
                              <StatusBadge
                                 category="operasional"
                                 value={armada.status_operasional}
                              />
                           </TableCell>
                           <TableCell>
                              <StatusBadge
                                 category="verifikasi"
                                 value={armada.status_verifikasi}
                              />
                           </TableCell>
                            {showActions ? (
                                <TableCell className="text-right space-x-2">
                                  <Button
                                     size="sm"
                                     variant="ghost"
                                     onClick={() => setDokumenArmada(armada)}
                                  >
                                     <FolderOpen className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                  <Button
                                     size="sm"
                                     variant="outline"
                                     className="text-brand-green border-green-200 hover:bg-green-50 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-950/50"
                                    onClick={() => {
                                       setError(null);
                                       setSelectedArmada(armada);
                                       setAction("terverifikasi");
                                    }}
                                 >
                                    <CheckCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                                    Terima
                                 </Button>
                                 <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-error border-red-200 hover:bg-red-50 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-950/50"
                                    onClick={() => {
                                       setError(null);
                                       setSelectedArmada(armada);
                                       setAction("ditolak");
                                    }}
                                 >
                                    <XCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                                     Tolak
                                  </Button>
                               </TableCell>
                            ) : (
                               <TableCell className="text-right">
                                  <Button
                                     size="sm"
                                     variant="ghost"
                                     onClick={() => setDokumenArmada(armada)}
                                  >
                                     <FolderOpen className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                               </TableCell>
                            )}
            {showActions && selectedIds.size > 0 && (
               <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-base-300 bg-base-200/50 px-3 py-2">
                  <span className="text-sm font-medium">
                     {selectedIds.size} dipilih
                  </span>
                  <Button
                     size="sm"
                     variant="outline"
                     className="text-brand-green border-green-200 hover:bg-green-50 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-950/50"
                     disabled={bulkLoading}
                     onClick={() => handleBulkVerifikasi("terverifikasi")}
                  >
                     <CheckCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                     Verifikasi Semua
                  </Button>
                  <Button
                     size="sm"
                     variant="outline"
                     className="text-error border-red-200 hover:bg-red-50 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-950/50"
                     disabled={bulkLoading}
                     onClick={() => handleBulkVerifikasi("ditolak")}
                  >
                     <XCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                     Tolak Semua
                  </Button>
                  <Button
                     size="sm"
                     variant="ghost"
                     disabled={bulkLoading}
                     onClick={() => setSelectedIds(new Set())}
                  >
                     Batal Pilihan
                  </Button>
               </div>
            )}
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>
            </div>

            <Dialog
               open={!!selectedArmada}
               onOpenChange={() => setSelectedArmada(null)}
            >
               <DialogContent>
                  <DialogHeader>
                     <DialogTitle>
                        {action === "terverifikasi"
                           ? "Verifikasi Armada"
                           : "Tolak Verifikasi Armada"}
                     </DialogTitle>
                     <DialogDescription>
                        {selectedArmada?.nomor_polisi} - {selectedArmada?.merk}{" "}
                        {selectedArmada?.tipe}
                     </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <label className="text-sm font-medium">
                           Keterangan {action === "ditolak" && "*"}
                        </label>
                        <Textarea
                           placeholder={
                              action === "terverifikasi"
                                 ? "Keterangan opsional..."
                                 : "Alasan penolakan..."
                           }
                           value={keterangan}
                           onChange={(e) => setKeterangan(e.target.value)}
                           required={action === "ditolak"}
                        />
                     </div>
                  </div>

                  <DialogFooter>
                     <Button
                        variant="outline"
                        onClick={() => setSelectedArmada(null)}
                     >
                        Batal
                     </Button>
                     <Button
                        onClick={handleVerifikasi}
                        disabled={
                           loading || (action === "ditolak" && !keterangan)
                        }
                        variant={
                           action === "terverifikasi"
                              ? "default"
                              : "destructive"
                        }
                     >
                        {loading
                           ? "Memproses…"
                           : action === "terverifikasi"
                             ? "Verifikasi"
                             : "Tolak"}
                     </Button>
                  </DialogFooter>
               </DialogContent>
             </Dialog>

            <ArmadaDokumenDialog
               open={!!dokumenArmada}
               onOpenChange={(o) => !o && setDokumenArmada(null)}
               armada={dokumenArmada}
               poId=""
               readOnly
            />
          </>
       );
   },
);
