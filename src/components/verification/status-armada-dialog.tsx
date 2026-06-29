"use client";

import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Armada } from "@/lib/supabase/queries/verification.types";

type ArmadaStatusOperasional = Armada["status_operasional"];

const statusOptions: Array<{
   value: ArmadaStatusOperasional;
   label: string;
   color: string;
}> = [
   { value: "aktif", label: "Aktif", color: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300" },
   {
      value: "tidak_aktif",
      label: "Tidak Aktif",
      color: "bg-base-200 text-base-content/70",
   },
   { value: "rusak", label: "Rusak", color: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300" },
   {
      value: "cadangan",
      label: "Cadangan",
      color: "bg-amber-100 text-accent dark:bg-amber-950/50 dark:text-amber-300",
   },
   { value: "dijual", label: "Dijual", color: "bg-primary/15 text-primary dark:bg-blue-950/50 dark:text-blue-300" },
];

interface StatusArmadaDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   armada: Armada | null;
   onSubmit: (id: string, status: ArmadaStatusOperasional) => void;
}

export function StatusArmadaDialog({
   open,
   onOpenChange,
   armada,
   onSubmit,
}: StatusArmadaDialogProps) {
   if (!armada) return null;

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Ubah Status Operasional</DialogTitle>
               <DialogDescription>
                  {armada.nomor_polisi} - {armada.merk} {armada.tipe}
               </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4">
               {statusOptions.map((status) => (
                  <Button
                     key={status.value}
                     variant={
                        armada.status_operasional === status.value
                           ? "default"
                           : "outline"
                     }
                     className="justify-start h-auto py-3 px-4"
                     onClick={() => {
                        onSubmit(armada.id, status.value);
                     }}
                  >
                     <Badge className={`mr-3 ${status.color}`}>
                        {status.label}
                     </Badge>
                     <span className="text-sm text-base-content/70">
                        {status.value === "aktif" && "Armada siap beroperasi"}
                        {status.value === "tidak_aktif" &&
                           "Armada tidak beroperasi sementara"}
                        {status.value === "rusak" && "Armada dalam perbaikan"}
                        {status.value === "cadangan" && "Armada cadangan"}
                        {status.value === "dijual" && "Armada akan dijual"}
                     </span>
                  </Button>
               ))}
            </div>
         </DialogContent>
      </Dialog>
   );
}
