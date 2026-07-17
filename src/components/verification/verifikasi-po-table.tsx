"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { editPO, verifikasiPO } from "@/lib/supabase/queries/verification.client";
import type { PO } from "@/lib/supabase/queries/verification.types";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, Pencil, Search, User, XCircle } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

interface VerifikasiPOTableProps {
   data: PO[];
   showActions: boolean;
}

export function VerifikasiPOTable({
   data,
   showActions,
}: VerifikasiPOTableProps) {
   const [selectedPO, setSelectedPO] = useState<PO | null>(null);
   const [action, setAction] = useState<"aktif" | "ditolak" | null>(null);
   const [keterangan, setKeterangan] = useState("");
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [editTarget, setEditTarget] = useState<PO | null>(null);
   const [editForm, setEditForm] = useState({
      kode_po: "",
      nama_perusahaan: "",
      nama_pemilik: "",
      alamat: "",
      telepon: "",
      npwp: "",
   });
   const [editLoading, setEditLoading] = useState(false);
   const [search, setSearch] = useState("");
   const [visibleCount, setVisibleCount] = useState(15);
   const router = useRouter();

    const filteredData = (() => {
       const q = search.trim().toLowerCase();
       if (!q) return data;
       return data.filter(
          (po) =>
             po.kode_po.toLowerCase().includes(q) ||
             po.nama_perusahaan.toLowerCase().includes(q) ||
             (po.nama_pemilik ?? "").toLowerCase().includes(q),
       );
    })();

   const openEditDialog = (po: PO) => {
      setEditTarget(po);
      setEditForm({
         kode_po: po.kode_po,
         nama_perusahaan: po.nama_perusahaan,
         nama_pemilik: po.nama_pemilik ?? "",
         alamat: po.alamat ?? "",
         telepon: po.telepon ?? "",
         npwp: po.npwp ?? "",
      });
      setError(null);
   };

   const submitEdit = async () => {
      if (!editTarget) return;
      if (!editForm.kode_po.trim() || !editForm.nama_perusahaan.trim()) {
         setError("Kode PO dan nama perusahaan wajib diisi");
         return;
      }
      setEditLoading(true);
      setError(null);
      try {
         await editPO(editTarget.id, {
            kode_po: editForm.kode_po.trim().toUpperCase(),
            nama_perusahaan: editForm.nama_perusahaan.trim(),
            nama_pemilik: editForm.nama_pemilik.trim() || null,
            alamat: editForm.alamat.trim() || null,
            telepon: editForm.telepon.trim() || null,
            npwp: editForm.npwp.trim() || null,
         });
         toast.success("Data PO berhasil diperbarui");
         router.refresh();
         setEditTarget(null);
      } catch (err) {
         setError(
            err instanceof Error ? err.message : "Gagal memperbarui PO",
         );
      } finally {
         setEditLoading(false);
      }
   };

   const handleVerifikasi = async () => {
      if (!selectedPO || !action) return;

      setLoading(true);
      setError(null);
      try {
         await verifikasiPO(selectedPO.id, action, keterangan);
         toast.success(
            action === "aktif"
               ? "PO berhasil diverifikasi"
               : "PO berhasil ditolak",
         );
         router.refresh();
         setSelectedPO(null);
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
               <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-3 py-2 text-sm text-error">
                  <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                  <span>{error}</span>
               </div>
            )}
            <EmptyState title="Tidak ada data PO" icon={User} />
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
          <div className="mb-3 flex justify-end">
            <div className="relative w-full sm:w-56">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/70" aria-hidden="true" />
               <Input
                  placeholder="Cari kode PO, nama..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-8 text-sm"
               />
            </div>
         </div>
          <div className="border border-base-300 rounded-lg bg-base-100 overflow-hidden">
             <Table caption="Daftar PO menunggu verifikasi">
               <TableHeader>
                  <TableRow className="bg-base-200/50">
                     <TableHead className="text-[13px]">Kode PO</TableHead>
                     <TableHead className="text-[13px]">
                        Nama Perusahaan
                     </TableHead>
                     <TableHead className="text-[13px]">Pemilik</TableHead>
                     <TableHead className="text-[13px]">Kontak</TableHead>
                     <TableHead className="text-[13px]">Status</TableHead>
                     {showActions && (
                        <TableHead className="text-right text-[13px]">
                           Aksi
                        </TableHead>
                     )}
                  </TableRow>
               </TableHeader>
               <TableBody>
                    {filteredData.slice(0, visibleCount).map((po) => (
                     <TableRow key={po.id}>
                        <TableCell className="font-medium">
                           {po.kode_po}
                        </TableCell>
                        <TableCell>{po.nama_perusahaan}</TableCell>
                        <TableCell>{po.nama_pemilik || "-"}</TableCell>
                        <TableCell>
                           <div className="text-sm">
                              <div>{po.telepon || "-"}</div>
                              <div className="text-base-content/70">
                                 {po.profiles?.email}
                              </div>
                           </div>
                        </TableCell>
                        <TableCell>
                           <StatusBadge
                              category="po"
                              value={po.status_verifikasi}
                              label={
                                 po.status_verifikasi === "aktif"
                                    ? "Aktif"
                                    : undefined
                              }
                           />
                        </TableCell>
                        {showActions && (
                            <TableCell className="text-right space-x-2">
                               <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
                                  onClick={() => openEditDialog(po)}
                               >
                                  <Pencil className="h-3.5 w-3.5" />
                               </Button>
                               <Button
                                 size="sm"
                                 variant="outline"
                                 className="text-brand-green border-green-200 hover:bg-green-50 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-950/50"
                                 onClick={() => {
                                    setError(null);
                                    setSelectedPO(po);
                                    setAction("aktif");
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
                                    setSelectedPO(po);
                                    setAction("ditolak");
                                 }}
                              >
                                 <XCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                                 Tolak
                              </Button>
                           </TableCell>
                        )}
                     </TableRow>
                  ))}
               </TableBody>
             </Table>
          </div>

          {visibleCount < filteredData.length && (
             <div className="flex justify-center pt-3">
                <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setVisibleCount((c) => c + 15)}
                >
                   Tampilkan Lebih Banyak ({filteredData.length - visibleCount} lagi)
                </Button>
             </div>
          )}

         <Dialog open={!!selectedPO} onOpenChange={() => setSelectedPO(null)}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>
                     {action === "aktif"
                        ? "Verifikasi PO"
                        : "Tolak Verifikasi PO"}
                  </DialogTitle>
                  <DialogDescription>
                     {selectedPO?.nama_perusahaan} ({selectedPO?.kode_po})
                  </DialogDescription>
               </DialogHeader>

               <div className="space-y-4 py-4">
                  <div className="space-y-2">
                     <label className="text-sm font-medium">
                        Keterangan {action === "ditolak" && "*"}
                     </label>
                     <Textarea
                        placeholder={
                           action === "aktif"
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
                  <Button variant="outline" onClick={() => setSelectedPO(null)}>
                     Batal
                  </Button>
                  <Button
                     onClick={handleVerifikasi}
                     disabled={loading || (action === "ditolak" && !keterangan)}
                     variant={action === "aktif" ? "default" : "destructive"}
                  >
                     {loading
                        ? "Memproses…"
                        : action === "aktif"
                          ? "Verifikasi"
                          : "Tolak"}
                  </Button>
               </DialogFooter>
            </DialogContent>
          </Dialog>

         <Dialog
            open={!!editTarget}
            onOpenChange={(open) => {
               if (!open) setEditTarget(null);
            }}
         >
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Edit Data PO</DialogTitle>
                  <DialogDescription>
                     Perbarui data perusahaan untuk {editTarget?.nama_perusahaan}
                  </DialogDescription>
               </DialogHeader>

               <div className="space-y-3 py-2">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                     <div className="space-y-1.5">
                        <label className="text-sm font-medium text-base-content">
                           Kode PO *
                        </label>
                        <Input
                           value={editForm.kode_po}
                           onChange={(e) =>
                              setEditForm((f) => ({ ...f, kode_po: e.target.value }))
                           }
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-sm font-medium text-base-content">
                           Telepon
                        </label>
                        <Input
                           value={editForm.telepon}
                           onChange={(e) =>
                              setEditForm((f) => ({ ...f, telepon: e.target.value }))
                           }
                        />
                     </div>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium text-base-content">
                        Nama Perusahaan *
                     </label>
                     <Input
                        value={editForm.nama_perusahaan}
                        onChange={(e) =>
                           setEditForm((f) => ({
                              ...f,
                              nama_perusahaan: e.target.value,
                           }))
                        }
                     />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium text-base-content">
                        Nama Pemilik
                     </label>
                     <Input
                        value={editForm.nama_pemilik}
                        onChange={(e) =>
                           setEditForm((f) => ({
                              ...f,
                              nama_pemilik: e.target.value,
                           }))
                        }
                     />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                     <div className="space-y-1.5">
                        <label className="text-sm font-medium text-base-content">
                           Alamat
                        </label>
                        <Input
                           value={editForm.alamat}
                           onChange={(e) =>
                              setEditForm((f) => ({ ...f, alamat: e.target.value }))
                           }
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-sm font-medium text-base-content">
                           NPWP
                        </label>
                        <Input
                           value={editForm.npwp}
                           onChange={(e) =>
                              setEditForm((f) => ({ ...f, npwp: e.target.value }))
                           }
                        />
                     </div>
                  </div>
               </div>

               <DialogFooter>
                  <Button variant="outline" onClick={() => setEditTarget(null)}>
                     Batal
                  </Button>
                  <Button onClick={submitEdit} disabled={editLoading}>
                     {editLoading ? "Menyimpan…" : "Simpan"}
                  </Button>
               </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
    );
}
