"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Armada } from "@/lib/supabase/queries/verification.types";

const formSchema = z.object({
   nomor_polisi: z.string().min(3, "Nomor polisi wajib diisi"),
   nomor_lambung: z.string().optional(),
   merk: z.string().min(1, "Merk wajib diisi"),
   tipe: z.string().min(1, "Tipe wajib diisi"),
   tahun_pembuatan: z.coerce
      .number()
      .min(1990)
      .max(new Date().getFullYear())
      .optional(),
   nomor_chassis: z.string().optional(),
   nomor_mesin: z.string().optional(),
   kapasitas_penumpang: z.coerce.number().min(1).optional(),
});

export type ArmadaFormValues = z.infer<typeof formSchema>;

interface ArmadaFormDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   armada: Armada | null;
   onSubmit: (data: z.infer<typeof formSchema>) => void;
}

export function ArmadaFormDialog({
   open,
   onOpenChange,
   armada,
   onSubmit,
}: ArmadaFormDialogProps) {
   const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
         nomor_polisi: "",
         nomor_lambung: "",
         merk: "",
         tipe: "",
         tahun_pembuatan: undefined,
         nomor_chassis: "",
         nomor_mesin: "",
         kapasitas_penumpang: undefined,
      },
   });

   useEffect(() => {
      if (armada) {
         form.reset({
            nomor_polisi: armada.nomor_polisi,
            nomor_lambung: armada.nomor_lambung || "",
            merk: armada.merk || "",
            tipe: armada.tipe || "",
            tahun_pembuatan: armada.tahun_pembuatan || undefined,
            nomor_chassis: armada.nomor_chassis || "",
            nomor_mesin: armada.nomor_mesin || "",
            kapasitas_penumpang: armada.kapasitas_penumpang || undefined,
         });
      } else {
         form.reset();
      }
   }, [armada, form]);

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
               <DialogTitle>
                  {armada ? "Edit Armada" : "Tambah Armada Baru"}
               </DialogTitle>
            </DialogHeader>

            <form
               onSubmit={form.handleSubmit(onSubmit)}
               className="space-y-4 pt-4"
            >
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label htmlFor="nomor_polisi">Nomor Polisi *</Label>
                      <Input
                         id="nomor_polisi"
                         placeholder="B 1234 XYZ"
                         aria-invalid={!!form.formState.errors.nomor_polisi}
                         {...form.register("nomor_polisi")}
                      />
                      {form.formState.errors.nomor_polisi && (
                         <p className="text-sm text-error">
                            {form.formState.errors.nomor_polisi.message}
                         </p>
                      )}
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="nomor_lambung">Nomor Lambung</Label>
                     <Input
                        id="nomor_lambung"
                        placeholder="001"
                        {...form.register("nomor_lambung")}
                     />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label htmlFor="merk">Merk *</Label>
                      <Input
                         id="merk"
                         placeholder="Mercedes-Benz"
                         aria-invalid={!!form.formState.errors.merk}
                         {...form.register("merk")}
                      />
                      {form.formState.errors.merk && (
                         <p className="text-sm text-error">
                            {form.formState.errors.merk.message}
                         </p>
                      )}
                   </div>
                   <div className="space-y-2">
                      <Label htmlFor="tipe">Tipe *</Label>
                      <Input
                         id="tipe"
                         placeholder="OH 1526"
                         aria-invalid={!!form.formState.errors.tipe}
                         {...form.register("tipe")}
                      />
                      {form.formState.errors.tipe && (
                         <p className="text-sm text-error">
                            {form.formState.errors.tipe.message}
                         </p>
                      )}
                   </div>
               </div>

               <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                     <Label htmlFor="tahun_pembuatan">Tahun Pembuatan</Label>
                      <Input
                         id="tahun_pembuatan"
                         type="number"
                         aria-invalid={!!form.formState.errors.tahun_pembuatan}
                         {...form.register("tahun_pembuatan")}
                      />
                      {form.formState.errors.tahun_pembuatan && (
                         <p className="text-sm text-error">
                            {form.formState.errors.tahun_pembuatan.message}
                         </p>
                      )}
                   </div>
                   <div className="space-y-2">
                      <Label htmlFor="kapasitas_penumpang">Kapasitas</Label>
                      <Input
                         id="kapasitas_penumpang"
                         type="number"
                         placeholder="40"
                         aria-invalid={!!form.formState.errors.kapasitas_penumpang}
                         {...form.register("kapasitas_penumpang")}
                      />
                      {form.formState.errors.kapasitas_penumpang && (
                         <p className="text-sm text-error">
                            {form.formState.errors.kapasitas_penumpang.message}
                         </p>
                      )}
                  </div>
               </div>

               <div className="space-y-2">
                  <Label htmlFor="nomor_chassis">Nomor Chassis</Label>
                  <Input
                     id="nomor_chassis"
                     {...form.register("nomor_chassis")}
                  />
               </div>

               <div className="space-y-2">
                  <Label htmlFor="nomor_mesin">Nomor Mesin</Label>
                  <Input id="nomor_mesin" {...form.register("nomor_mesin")} />
               </div>

               <div className="flex justify-end gap-3 pt-4">
                  <Button
                     type="button"
                     variant="outline"
                     onClick={() => onOpenChange(false)}
                  >
                     Batal
                  </Button>
                  <Button type="submit">
                     {armada ? "Simpan Perubahan" : "Tambah Armada"}
                  </Button>
               </div>
            </form>
         </DialogContent>
      </Dialog>
   );
}
