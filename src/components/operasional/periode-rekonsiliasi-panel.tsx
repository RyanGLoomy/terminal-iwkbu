"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils/format-date";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Play, CheckCircle2, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
   Card,
   CardContent,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";

interface PeriodeRekonsiliasi {
   id: string;
   nama_periode: string;
   tanggal_mulai: string;
   tanggal_selesai: string;
   status: "draft" | "aktif" | "ditutup";
   catatan: string | null;
   created_at: string;
   closed_at: string | null;
}

const statusConfig: Record<
   string,
   { label: string; color: string; icon: typeof Plus }
> = {
   draft: {
      label: "Draft",
      color: "bg-base-200 text-base-content/70 border border-base-300",
      icon: Plus,
   },
   aktif: {
      label: "Aktif",
      color: "bg-emerald-50 text-brand-green dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
      icon: Play,
   },
   ditutup: {
      label: "Ditutup",
      color: "bg-primary/10 text-primary bg-primary/10 border border-primary/25 dark:bg-blue-950/50 dark:border-blue-800",
      icon: CheckCircle2,
   },
};

export function PeriodeRekonsiliasiPanel() {
   const [periodeList, setPeriodeList] = useState<PeriodeRekonsiliasi[]>([]);
   const [loading, setLoading] = useState(true);
   const [isCreateOpen, setIsCreateOpen] = useState(false);
   const [createForm, setCreateForm] = useState({
      nama_periode: "",
      tanggal_mulai: "",
      tanggal_selesai: "",
      catatan: "",
   });

   const loadPeriode = async () => {
      try {
         const res = await fetch("/api/staf-iw/periode-rekonsiliasi");
         const payload = await res.json();
         if (res.ok) {
            setPeriodeList(payload.data ?? []);
         }
      } catch {
         toast.error("Gagal memuat periode rekonsiliasi");
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      loadPeriode();
   }, [loadPeriode]);

   async function handleCreate() {
      if (
         !createForm.nama_periode ||
         !createForm.tanggal_mulai ||
         !createForm.tanggal_selesai
      ) {
         toast.error("Semua field wajib diisi");
         return;
      }

      const res = await fetch("/api/staf-iw/periode-rekonsiliasi", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(createForm),
      });

      if (res.ok) {
         toast.success("Periode rekonsiliasi dibuat");
         setCreateForm({
            nama_periode: "",
            tanggal_mulai: "",
            tanggal_selesai: "",
            catatan: "",
         });
         setIsCreateOpen(false);
         await loadPeriode();
      } else {
         const payload = await res.json();
         toast.error(payload?.message ?? "Gagal membuat periode");
      }
   }

   async function handleStatusChange(
      id: string,
      namaPeriode: string,
      status: "draft" | "aktif" | "ditutup",
   ) {
      const res = await fetch(`/api/staf-iw/periode-rekonsiliasi/${id}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ status }),
      });

      if (res.ok) {
         toast.success(
            `Periode "${namaPeriode}" ${status === "aktif" ? "diaktifkan" : status === "ditutup" ? "ditutup" : "diubah ke draft"}`,
         );
         await loadPeriode();
      } else {
         const payload = await res.json();
         toast.error(payload?.message ?? "Gagal mengubah status");
      }
   }

   async function handleDelete(id: string, namaPeriode: string) {
      if (!confirm(`Hapus periode "${namaPeriode}"?`)) return;

      const res = await fetch(`/api/staf-iw/periode-rekonsiliasi/${id}`, {
         method: "DELETE",
      });

      if (res.ok) {
         toast.success("Periode dihapus");
         await loadPeriode();
      } else {
         const payload = await res.json();
         toast.error(payload?.message ?? "Gagal menghapus periode");
      }
   }

   return (
      <Card className="border-base-300">
         <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
               <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
               Periode Rekonsiliasi
               <Button
                  size="sm"
                  className="ml-auto"
                  onClick={() => setIsCreateOpen(true)}
               >
                  <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Buat Periode
               </Button>
            </CardTitle>
         </CardHeader>
         <CardContent>
            {loading ? (
               <p className="text-sm text-base-content/70 text-center py-6">
                  Memuat data…
               </p>
            ) : periodeList.length === 0 ? (
               <p className="text-sm text-base-content/70 text-center py-6">
                  Belum ada periode rekonsiliasi
               </p>
            ) : (
               <div className="space-y-2">
                  {periodeList.map((p) => {
                     const cfg = statusConfig[p.status];
                     return (
                        <div
                           key={p.id}
                           className="flex items-center justify-between gap-3 rounded-lg border border-base-300 px-4 py-3"
                        >
                           <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                 <p className="text-sm font-medium truncate">
                                    {p.nama_periode}
                                 </p>
                                 <Badge className={`text-[11px] ${cfg.color}`}>
                                    {cfg.label}
                                 </Badge>
                              </div>
                              <p className="text-xs text-base-content/70 mt-0.5">
                                 {formatDate(p.tanggal_mulai)}{" "}
                                 &mdash;{" "}
                                 {formatDate(p.tanggal_selesai)}
                                 {p.catatan ? ` · ${p.catatan}` : ""}
                              </p>
                           </div>
                           <div className="flex items-center gap-1 shrink-0">
                              {p.status === "draft" && (
                                 <>
                                    <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() =>
                                          handleStatusChange(
                                             p.id,
                                             p.nama_periode,
                                             "aktif",
                                          )
                                       }
                                    >
                                       <Play className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                                       Aktifkan
                                    </Button>
                                    <Button
                                       size="sm"
                                       variant="ghost"
                                       onClick={() =>
                                          handleDelete(p.id, p.nama_periode)
                                       }
                                    >
                                       <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                 </>
                              )}
                              {p.status === "aktif" && (
                                 <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                       handleStatusChange(
                                          p.id,
                                          p.nama_periode,
                                          "ditutup",
                                       )
                                    }
                                 >
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                                    Tutup
                                 </Button>
                              )}
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}
         </CardContent>

         <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Buat Periode Rekonsiliasi</DialogTitle>
                  <DialogDescription>
                     Definisikan periode untuk siklus rekonsiliasi IWKBU.
                  </DialogDescription>
               </DialogHeader>
               <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                     <Label htmlFor="nama">Nama Periode</Label>
                     <Input
                        id="nama"
                        placeholder="contoh: Januari 2026"
                        value={createForm.nama_periode}
                        onChange={(e) =>
                           setCreateForm((f) => ({
                              ...f,
                              nama_periode: e.target.value,
                           }))
                        }
                     />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                     <div className="space-y-1.5">
                        <Label htmlFor="mulai">Tanggal Mulai</Label>
                        <Input
                           id="mulai"
                           type="date"
                           value={createForm.tanggal_mulai}
                           onChange={(e) =>
                              setCreateForm((f) => ({
                                 ...f,
                                 tanggal_mulai: e.target.value,
                              }))
                           }
                        />
                     </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="selesai">Tanggal Selesai</Label>
                        <Input
                           id="selesai"
                           type="date"
                           value={createForm.tanggal_selesai}
                           onChange={(e) =>
                              setCreateForm((f) => ({
                                 ...f,
                                 tanggal_selesai: e.target.value,
                              }))
                           }
                        />
                     </div>
                  </div>
                  <div className="space-y-1.5">
                     <Label htmlFor="catatan">Catatan (opsional)</Label>
                     <Input
                        id="catatan"
                        placeholder="Catatan tambahan..."
                        value={createForm.catatan}
                        onChange={(e) =>
                           setCreateForm((f) => ({
                              ...f,
                              catatan: e.target.value,
                           }))
                        }
                     />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                     <Button
                        variant="outline"
                        onClick={() => setIsCreateOpen(false)}
                     >
                        Batal
                     </Button>
                     <Button onClick={handleCreate}>Buat Periode</Button>
                  </div>
               </div>
            </DialogContent>
         </Dialog>
      </Card>
   );
}
