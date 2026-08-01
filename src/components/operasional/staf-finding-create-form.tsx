"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconAlertCircle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/db-error";

type Option = { id: string; label: string };
type ArmadaOption = Option & { poId?: string };

interface StafFindingCreateFormProps {
   poOptions: Option[];
   armadaOptions: ArmadaOption[];
   prefill?: {
      poId?: string;
      armadaId?: string;
      nomorPolisi?: string;
      judul?: string;
      deskripsi?: string;
   };
   onSuccess?: () => void;
}

export function StafFindingCreateForm({
   poOptions,
   armadaOptions,
   prefill,
   onSuccess,
}: StafFindingCreateFormProps) {
   const router = useRouter();
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [form, setForm] = useState({
      poId: prefill?.poId ?? "",
      armadaId: prefill?.armadaId ?? "",
      nomorPolisi: prefill?.nomorPolisi ?? "",
      sourceType: "manual",
      judul: prefill?.judul ?? "",
      deskripsi: prefill?.deskripsi ?? "",
      severity: "medium",
      sourceDate: "",
      dueDate: "",
   });

   const filteredArmada = form.poId
      ? armadaOptions.filter((a) => a.poId === form.poId)
      : armadaOptions;

   useEffect(() => {
      setForm((prev) => ({
         ...prev,
         sourceDate: new Date().toISOString().slice(0, 10),
      }));
   }, []);

   const submit = async () => {
      setLoading(true);
      setError(null);
      try {
         const res = await fetch("/api/staf-iw/findings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });
         const payload = await res.json();
         if (!res.ok) throw new Error(payload.message ?? "Gagal membuat temuan");

         toast.success("Temuan berhasil dibuat");
          setForm({
            poId: "",
            armadaId: "",
            nomorPolisi: "",
            sourceType: "manual",
            judul: "",
            deskripsi: "",
            severity: "medium",
            sourceDate: new Date().toISOString().slice(0, 10),
            dueDate: "",
         });
         router.refresh();
         onSuccess?.();
      } catch (err: unknown) {
         setError(getErrorMessage(err));
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="space-y-4">
         {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-3 py-2 text-sm text-error">
               <IconAlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
               <span>{error}</span>
            </div>
         )}

         <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm">
               <span className="font-medium text-base-content">PO</span>
                <Select
                   value={form.poId}
                   onValueChange={(v) => setForm((c) => ({ ...c, poId: v, armadaId: "" }))}
                >
                   <SelectTrigger className="h-10 w-full rounded-md border border-base-300 bg-base-100 px-3">
                      <SelectValue placeholder="Pilih PO" />
                   </SelectTrigger>
                   <SelectContent>
                      {poOptions.map((option) => (
                         <SelectItem key={option.id} value={option.id}>
                            {option.label}
                         </SelectItem>
                      ))}
                   </SelectContent>
                </Select>
             </label>

             <label className="space-y-2 text-sm">
                <span className="font-medium text-base-content">Armada</span>
                <Select
                   value={form.armadaId}
                   onValueChange={(v) => setForm((c) => ({ ...c, armadaId: v }))}
                   disabled={!form.poId}
                >
                   <SelectTrigger className="h-10 w-full rounded-md border border-base-300 bg-base-100 px-3">
                      <SelectValue placeholder={form.poId ? "Pilih Armada" : "Pilih PO dahulu"} />
                   </SelectTrigger>
                   <SelectContent>
                      {filteredArmada.map((option) => (
                         <SelectItem key={option.id} value={option.id}>
                            {option.label}
                         </SelectItem>
                      ))}
                   </SelectContent>
                </Select>
            </label>

            <label className="space-y-2 text-sm">
               <span className="font-medium text-base-content">Nomor Polisi</span>
               <Input
                  value={form.nomorPolisi}
                  onChange={(e) => setForm((c) => ({ ...c, nomorPolisi: e.target.value }))}
                  placeholder="B1234XYZ"
               />
            </label>

            <label className="space-y-2 text-sm">
               <span className="font-medium text-base-content">Severity</span>
               <Select
                  value={form.severity}
                  onValueChange={(v) => setForm((c) => ({ ...c, severity: v }))}
               >
                  <SelectTrigger className="h-10 w-full rounded-md border border-base-300 bg-base-100 px-3">
                     <SelectValue placeholder="Pilih Severity" />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="low">Rendah</SelectItem>
                     <SelectItem value="medium">Sedang</SelectItem>
                     <SelectItem value="high">Tinggi</SelectItem>
                  </SelectContent>
               </Select>
            </label>

            <label className="space-y-2 text-sm">
               <span className="font-medium text-base-content">Tanggal Sumber</span>
               <Input
                  type="date"
                  value={form.sourceDate}
                  onChange={(e) => setForm((c) => ({ ...c, sourceDate: e.target.value }))}
               />
            </label>

            <label className="space-y-2 text-sm">
               <span className="font-medium text-base-content">Tenggat Waktu</span>
               <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((c) => ({ ...c, dueDate: e.target.value }))}
               />
            </label>

            <label className="space-y-2 text-sm">
               <span className="font-medium text-base-content">Judul</span>
               <Input
                  value={form.judul}
                  onChange={(e) => setForm((c) => ({ ...c, judul: e.target.value }))}
                  placeholder="Judul temuan"
               />
            </label>

            <label className="space-y-2 text-sm lg:col-span-2">
               <span className="font-medium text-base-content">Deskripsi</span>
               <Textarea
                  value={form.deskripsi}
                  onChange={(e) => setForm((c) => ({ ...c, deskripsi: e.target.value }))}
                  placeholder="Jelaskan temuan secara singkat"
                  rows={4}
               />
            </label>

            <div className="lg:col-span-2 flex items-end justify-end">
                <Button onClick={submit} disabled={loading || !form.poId}>
                  {loading ? "Membuat…" : "Buat Temuan"}
               </Button>
            </div>
         </div>
      </div>
   );
}
