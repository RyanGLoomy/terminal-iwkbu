"use client";

import { useState, useMemo } from "react";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
   Pencil,
   Power,
   Paperclip,
   Trash2,
   ArrowUp,
   ArrowDown,
   ArrowUpDown,
} from "lucide-react";
import type { Armada } from "@/lib/supabase/queries/verification.types";
import { EmptyState } from "@/components/shared/empty-state";

type SortKey =
   | "nomor_polisi"
   | "nomor_lambung"
   | "merk"
   | "tahun_pembuatan"
   | "status_operasional"
   | "status_verifikasi"
   | "created_at";

type SortDir = "asc" | "desc";

interface ArmadaTableProps {
   data: Armada[];
   loading: boolean;
   onEdit: (armada: Armada) => void;
   onChangeStatus: (armada: Armada) => void;
   onDokumen: (armada: Armada) => void;
   onDelete: (armada: Armada) => void;
   getStatusBadge: (status: Armada["status_operasional"]) => React.ReactNode;
   getVerifikasiBadge: (status: string) => React.ReactNode;
}

function getSortValue(item: Armada, key: SortKey): string | number {
   switch (key) {
      case "nomor_polisi":
         return item.nomor_polisi.toLowerCase();
      case "nomor_lambung":
         return (item.nomor_lambung ?? "").toLowerCase();
      case "merk":
         return `${item.merk ?? ""} ${item.tipe ?? ""}`.trim().toLowerCase();
      case "tahun_pembuatan":
         return item.tahun_pembuatan ?? 0;
      case "status_operasional":
         return item.status_operasional;
      case "status_verifikasi":
         return item.status_verifikasi;
      case "created_at":
         return item.created_at ?? "";
   }
}

export function ArmadaTable({
   data,
   loading,
   onEdit,
   onChangeStatus,
   onDokumen,
   onDelete,
   getStatusBadge,
   getVerifikasiBadge,
}: ArmadaTableProps) {
   const [sortKey, setSortKey] = useState<SortKey>("created_at");
   const [sortDir, setSortDir] = useState<SortDir>("desc");

   const toggleSort = (key: SortKey) => {
      if (sortKey === key) {
         setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
         setSortKey(key);
         setSortDir("asc");
      }
   };

   const sortedData = useMemo(() => {
      return [...data].sort((a, b) => {
         const va = getSortValue(a, sortKey);
         const vb = getSortValue(b, sortKey);
         const cmp =
            typeof va === "number" && typeof vb === "number"
               ? va - vb
               : String(va).localeCompare(String(vb));
         return sortDir === "asc" ? cmp : -cmp;
      });
   }, [data, sortKey, sortDir]);

   const SortIcon = ({ col }: { col: SortKey }) => {
      if (sortKey !== col)
         return <ArrowUpDown className="h-3 w-3 opacity-30" />;
      return sortDir === "asc" ? (
         <ArrowUp className="h-3 w-3" />
      ) : (
         <ArrowDown className="h-3 w-3" />
      );
   };

   const sortableTh = (
      label: string,
      col: SortKey,
      extraClassName = "",
   ) => (
      <TableHead
         className={`text-[13px] cursor-pointer select-none hover:text-foreground transition-colors ${extraClassName}`}
         onClick={() => toggleSort(col)}
      >
         <span className="inline-flex items-center gap-1.5">
            {label}
            <SortIcon col={col} />
         </span>
      </TableHead>
   );

   if (loading) {
      return (
         <div className="text-center py-10 text-muted-foreground">
            <div className="animate-spin h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full mx-auto mb-3" />
            <p className="text-sm">Memuat data...</p>
         </div>
      );
   }

    if (data.length === 0) {
        return (
           <EmptyState
              title="Tidak ada armada"
              description="Belum ada armada terdaftar atau tidak ada yang cocok dengan pencarian"
           />
        );
     }

   return (
      <div className="border border-border rounded-lg overflow-hidden">
          <Table caption="Daftar armada PO">
            <TableHeader>
               <TableRow className="bg-muted/50">
                  {sortableTh("No. Polisi", "nomor_polisi")}
                  {sortableTh("No. Lambung", "nomor_lambung")}
                  {sortableTh("Merk/Tipe", "merk")}
                  {sortableTh("Tahun", "tahun_pembuatan")}
                  {sortableTh("Status Operasional", "status_operasional")}
                  {sortableTh("Status Verifikasi", "status_verifikasi")}
                  <TableHead className="text-right text-[13px]">Aksi</TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
               {sortedData.map((item) => (
                  <TableRow key={item.id}>
                     <TableCell className="font-medium">
                        {item.nomor_polisi}
                     </TableCell>
                     <TableCell>{item.nomor_lambung || "-"}</TableCell>
                     <TableCell>
                        {item.merk} {item.tipe}
                     </TableCell>
                     <TableCell>{item.tahun_pembuatan || "-"}</TableCell>
                     <TableCell>
                        {getStatusBadge(item.status_operasional)}
                     </TableCell>
                     <TableCell>
                        {getVerifikasiBadge(item.status_verifikasi)}
                     </TableCell>
                      <TableCell className="text-right space-x-2">
                         <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDokumen(item)}
                         >
                            <Paperclip className="h-4 w-4" />
                         </Button>
                         <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(item)}
                            disabled={item.status_verifikasi === "terverifikasi"}
                         >
                           <Pencil className="h-4 w-4" />
                        </Button>
                         <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onChangeStatus(item)}
                         >
                            <Power className="h-4 w-4" />
                         </Button>
                         <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(item)}
                            disabled={item.status_verifikasi === "terverifikasi"}
                         >
                            <Trash2 className="h-4 w-4" />
                         </Button>
                     </TableCell>
                  </TableRow>
               ))}
            </TableBody>
         </Table>
      </div>
   );
}
