"use client";

import { useState, useEffect, useRef } from "react";
import {
   getArmadaByPO,
   createArmada,
   updateArmadaByPO,
   deleteArmada,
} from "@/lib/supabase/queries/verification.client";
import type { Armada } from "@/lib/supabase/queries/verification.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Plus, Bus, Search, Upload, FileDown } from "lucide-react";
import { toast } from "sonner";
import { ArmadaTable } from "./armada-table";
import dynamic from "next/dynamic";
import { ArmadaFormValues } from "./armada-form-dialog";

const ArmadaFormDialog = dynamic(() =>
   import("./armada-form-dialog").then((m) => ({ default: m.ArmadaFormDialog })),
);
const StatusArmadaDialog = dynamic(() =>
   import("./status-armada-dialog").then((m) => ({ default: m.StatusArmadaDialog })),
);
const ArmadaDokumenDialog = dynamic(() =>
   import("./armada-dokumen-dialog").then((m) => ({ default: m.ArmadaDokumenDialog })),
);
import { getErrorMessage } from "@/lib/db-error";

interface POArmadaManagerProps {
   poId: string;
}

export function POArmadaManager({ poId }: POArmadaManagerProps) {
   type ArmadaStatusOperasional = Armada["status_operasional"];
   const [armada, setArmada] = useState<Armada[]>([]);
   const [loading, setLoading] = useState(true);
   const [selectedArmada, setSelectedArmada] = useState<Armada | null>(null);
   const [isFormOpen, setIsFormOpen] = useState(false);
   const [isStatusOpen, setIsStatusOpen] = useState(false);
   const [isDokumenOpen, setIsDokumenOpen] = useState(false);
   const [search, setSearch] = useState("");
   const [statusFilter, setStatusFilter] = useState<string>("semua");
   const [importing, setImporting] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
      loadArmada();
   }, [poId]);

    const filteredArmada = (() => {
       const q = search.trim().toLowerCase();
       return armada.filter((a) => {
          const matchesSearch =
             !q ||
             a.nomor_polisi.toLowerCase().includes(q) ||
             (a.merk ?? "").toLowerCase().includes(q) ||
             (a.tipe ?? "").toLowerCase().includes(q) ||
             (a.nomor_lambung ?? "").toLowerCase().includes(q);
          const matchesStatus =
             statusFilter === "semua" ||
             a.status_operasional === statusFilter ||
             a.status_verifikasi === statusFilter;
          return matchesSearch && matchesStatus;
       });
    })();

   async function loadArmada() {
      try {
         const data = await getArmadaByPO(poId);
         setArmada(data);
      } catch {
      } finally {
         setLoading(false);
      }
   }

   const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImporting(true);
      try {
         const formData = new FormData();
         formData.append("file", file);
         const res = await fetch("/api/po/armada/import", {
            method: "POST",
            body: formData,
         });
         const body = await res.json();
         if (!res.ok) {
            toast.error(body?.message ?? "Gagal import CSV");
         } else {
            toast.success(
               `Import berhasil: ${body.success} armada${body.errors?.length > 0 ? `, ${body.errors.length} gagal` : ""}`,
            );
            await loadArmada();
         }
      } catch {
         toast.error("Gagal mengunggah file");
      } finally {
         setImporting(false);
         if (fileInputRef.current) fileInputRef.current.value = "";
      }
   };

   const handleCreate = async (data: ArmadaFormValues) => {
      try {
         await createArmada(data);
         toast.success("Armada berhasil ditambahkan");
         await loadArmada();
         setIsFormOpen(false);
      } catch {
         toast.error("Gagal menambahkan armada");
      }
   };

   const handleUpdate = async (id: string, data: ArmadaFormValues) => {
      try {
         await updateArmadaByPO(id, data);
         toast.success("Armada berhasil diperbarui");
         await loadArmada();
         setIsFormOpen(false);
         setSelectedArmada(null);
      } catch {
         toast.error("Gagal memperbarui armada");
      }
   };

    const handleStatusChange = async (
       id: string,
       status: ArmadaStatusOperasional,
    ) => {
       try {
          await updateArmadaByPO(id, { status_operasional: status });
          toast.success("Status armada berhasil diubah");
          await loadArmada();
          setIsStatusOpen(false);
          setSelectedArmada(null);
       } catch {
          toast.error("Gagal mengubah status armada");
       }
    };

   const handleDelete = async (armada: Armada) => {
      if (
         !confirm(
            `Hapus armada ${armada.nomor_polisi}? Tindakan ini tidak dapat dibatalkan.`,
         )
      )
         return;
      try {
         await deleteArmada(armada.id);
         toast.success("Armada berhasil dihapus");
         await loadArmada();
      } catch (error: unknown) {
         toast.error(getErrorMessage(error));
      }
   };

   const getStatusBadge = (status: ArmadaStatusOperasional) => (
      <StatusBadge category="operasional" value={status} />
   );

   const getVerifikasiBadge = (status: string) => (
      <StatusBadge category="verifikasi" value={status} />
   );

   return (
      <div className="space-y-4">
         <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div className="flex flex-wrap gap-2">
               <Button
                  onClick={() => {
                     setSelectedArmada(null);
                     setIsFormOpen(true);
                  }}
               >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Tambah Armada
               </Button>
               <Button
                  variant="outline"
                  disabled={importing}
                  onClick={() => fileInputRef.current?.click()}
               >
                  <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                  {importing ? "Mengimpor..." : "Import CSV"}
               </Button>
               <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleImport}
               />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/70" aria-hidden="true" />
                  <Input
                     placeholder="Cari nopol, merk, lambung..."
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     className="pl-9 h-9 w-full sm:w-56"
                  />
               </div>
               <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                     <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="semua">Semua Status</SelectItem>
                     <SelectItem value="aktif">Operasional: Aktif</SelectItem>
                     <SelectItem value="tidak_aktif">
                        Operasional: Tidak Aktif
                     </SelectItem>
                     <SelectItem value="rusak">Operasional: Rusak</SelectItem>
                     <SelectItem value="cadangan">
                        Operasional: Cadangan
                     </SelectItem>
                     <SelectItem value="dijual">Operasional: Dijual</SelectItem>
                     <SelectItem value="menunggu">
                        Verifikasi: Menunggu
                     </SelectItem>
                     <SelectItem value="terverifikasi">
                        Verifikasi: Terverifikasi
                     </SelectItem>
                     <SelectItem value="ditolak">Verifikasi: Ditolak</SelectItem>
                  </SelectContent>
               </Select>
            </div>
         </div>

         <Card className="border-base-300">
            <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                   <Bus className="h-4 w-4 text-primary" aria-hidden="true" />
                   Daftar Armada ({filteredArmada.length}
                   {filteredArmada.length !== armada.length &&
                      ` dari ${armada.length}`})
                </CardTitle>
             </CardHeader>
             <CardContent>
                <ArmadaTable
                    data={filteredArmada}
                   loading={loading}
                   onEdit={(item) => {
                      setSelectedArmada(item);
                      setIsFormOpen(true);
                   }}
                    onChangeStatus={(item) => {
                       setSelectedArmada(item);
                       setIsStatusOpen(true);
                    }}
                    onDokumen={(item) => {
                       setSelectedArmada(item);
                       setIsDokumenOpen(true);
                    }}
                    onDelete={handleDelete}
                    getStatusBadge={getStatusBadge}
                    getVerifikasiBadge={getVerifikasiBadge}
                    onQuickStatusChange={async (armada, newStatus) => {
                       try {
                          await updateArmadaByPO(armada.id, {
                             ...armada,
                             status_operasional: newStatus as Armada["status_operasional"],
                          });
                          toast.success(`Status diubah ke ${newStatus.replace("_", " ")}`);
                          await loadArmada();
                       } catch {
                          toast.error("Gagal mengubah status");
                       }
                    }}
                />
            </CardContent>
         </Card>

         <ArmadaFormDialog
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            armada={selectedArmada}
            onSubmit={
               selectedArmada
                  ? (data) => handleUpdate(selectedArmada.id, data)
                  : handleCreate
            }
         />

          <StatusArmadaDialog
             open={isStatusOpen}
             onOpenChange={setIsStatusOpen}
             armada={selectedArmada}
             onSubmit={handleStatusChange}
          />

          <ArmadaDokumenDialog
             open={isDokumenOpen}
             onOpenChange={setIsDokumenOpen}
             armada={selectedArmada}
             poId={poId}
          />
      </div>
   );
}
