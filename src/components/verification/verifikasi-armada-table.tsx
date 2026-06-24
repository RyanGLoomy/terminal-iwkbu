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
import { AlertCircle, CheckCircle, XCircle, Bus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

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

      if (data.length === 0) {
         return (
            <div className="space-y-3">
               {error && (
                  <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-3 py-2 text-sm text-destructive">
                     <AlertCircle className="mt-0.5 h-4 w-4" />
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
               <div className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span>{error}</span>
               </div>
            )}
            <div className="border border-border rounded-lg bg-card overflow-hidden">
                <Table caption="Daftar armada menunggu verifikasi">
                  <TableHeader>
                     <TableRow className="bg-muted/50">
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
                        {showActions && (
                           <TableHead className="text-right text-[13px]">
                              Aksi
                           </TableHead>
                        )}
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {data.map((armada) => (
                        <TableRow key={armada.id}>
                           <TableCell className="font-medium">
                              {armada.nomor_polisi}
                           </TableCell>
                           <TableCell>
                              {armada.merk} {armada.tipe}
                           </TableCell>
                           <TableCell>
                              <div className="text-sm">
                                 <div>{armada.po?.nama_perusahaan || "-"}</div>
                                 <div className="text-muted-foreground">
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
                           {showActions && (
                              <TableCell className="text-right space-x-2">
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
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Terima
                                 </Button>
                                 <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive border-red-200 hover:bg-red-50 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-950/50"
                                    onClick={() => {
                                       setError(null);
                                       setSelectedArmada(armada);
                                       setAction("ditolak");
                                    }}
                                 >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Tolak
                                 </Button>
                              </TableCell>
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
                           ? "Memproses..."
                           : action === "terverifikasi"
                             ? "Verifikasi"
                             : "Tolak"}
                     </Button>
                  </DialogFooter>
               </DialogContent>
            </Dialog>
         </>
      );
   },
);
