"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils/format-date";
import {
   createPetugas,
   listPetugas,
   updatePetugas,
} from "@/lib/supabase/queries/petugas-admin.client";
import {
   listPetugasTerminal,
   upsertPetugasTerminal,
   togglePetugasTerminal,
   type PetugasTerminalRow,
} from "@/lib/supabase/queries/terminal.client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingState } from "@/components/shared/loading-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import {
   Loader2,
   Monitor,
   UserPlus,
   RefreshCw,
   Power,
   Pencil,
   KeyRound,
} from "lucide-react";

type DeviceRow = {
   id: string;
   email: string;
   full_name: string | null;
   is_active: boolean | null;
   terminal_id: string | null;
   created_at: string;
};

interface ManagementAkunPanelProps {
   terminalId: string;
   terminalOptions?: Array<{
      id: string;
      kode: string;
      nama: string;
   }>;
}

export function ManagementAkunPanel({
   terminalId,
   terminalOptions = [],
}: ManagementAkunPanelProps) {
   const [activeTerminalId, setActiveTerminalId] = useState(terminalId);

   /* ─── Akun Loket state ─── */
   const [devices, setDevices] = useState<DeviceRow[]>([]);
   const [devLoading, setDevLoading] = useState(true);
   const [devSaving, setDevSaving] = useState(false);
   const [devError, setDevError] = useState<string | null>(null);
   const [devSuccess, setDevSuccess] = useState<string | null>(null);
   const [generatedPassword, setGeneratedPassword] = useState<string | null>(
      null,
   );
   const [devLabel, setDevLabel] = useState("");
   const [devEmail, setDevEmail] = useState("");
   const [devPassword, setDevPassword] = useState("");
   const [devActionId, setDevActionId] = useState<string | null>(null);

   /* ─── Data Petugas state ─── */
   const [petugasList, setPetugasList] = useState<PetugasTerminalRow[]>([]);
   const [ptLoading, setPtLoading] = useState(true);
   const [ptSaving, setPtSaving] = useState(false);
   const [ptError, setPtError] = useState<string | null>(null);
   const [ptSuccess, setPtSuccess] = useState<string | null>(null);
   const [ptNama, setPtNama] = useState("");
   const [ptPin, setPtPin] = useState("");
   const [ptEditId, setPtEditId] = useState<string | null>(null);

   useEffect(() => {
      setActiveTerminalId(terminalId);
   }, [terminalId]);

   /* ─── Load Akun Loket ─── */
   const loadDevices = async () => {
      setDevLoading(true);
      setDevError(null);
      try {
         if (!activeTerminalId) {
            setDevices([]);
            return;
         }

         const data = await listPetugas(activeTerminalId);
         setDevices(data);
      } catch (err: unknown) {
         setDevError(
            err instanceof Error
               ? err.message
               : "Gagal memuat data akun loket",
         );
      } finally {
         setDevLoading(false);
      }
   };

   /* ─── Load Data Petugas ─── */
   const loadPetugas = async () => {
      setPtLoading(true);
      try {
         if (!activeTerminalId) {
            setPetugasList([]);
            return;
         }

         const data = await listPetugasTerminal(activeTerminalId);
         setPetugasList(data);
      } catch (err: unknown) {
          setPtError(err instanceof Error ? err.message : "Gagal memuat data petugas");
      } finally {
         setPtLoading(false);
      }
   };

   useEffect(() => {
      loadDevices();
      loadPetugas();
   }, [activeTerminalId]);

   /* ─── Create Akun Loket ─── */
   const handleCreateDevice = async () => {
      setDevSaving(true);
      setDevError(null);
      setDevSuccess(null);
      setGeneratedPassword(null);

      try {
         if (!devLabel.trim()) {
            throw new Error("Nama loket wajib diisi");
         }
         if (!activeTerminalId) {
            throw new Error("Terminal wajib dipilih");
         }

          const result = await createPetugas({
             label: devLabel.trim(),
             terminal_id: activeTerminalId,
             email: devEmail.trim() || undefined,
             password: devPassword.trim() || undefined,
          });

         setDevSuccess("Akun loket berhasil dibuat.");
         setGeneratedPassword(result.password);
         setDevLabel("");
         setDevEmail("");
         setDevPassword("");
         await loadDevices();
      } catch (err: unknown) {
         setDevError(
            err instanceof Error ? err.message : "Gagal membuat akun loket",
         );
      } finally {
         setDevSaving(false);
      }
   };

   /* ─── Tambah/Edit Petugas ─── */
   const [ptGeneratedPin, setPtGeneratedPin] = useState<string | null>(null);

   const handleSavePetugas = async () => {
      setPtSaving(true);
      setPtError(null);
      setPtSuccess(null);
      setPtGeneratedPin(null);

      try {
         if (!ptNama.trim()) {
            throw new Error("Nama petugas wajib diisi");
         }
         if (!activeTerminalId) {
            throw new Error("Terminal wajib dipilih");
         }
         if (ptPin && !/^\d{4,6}$/.test(ptPin)) {
            throw new Error("PIN harus 4-6 digit angka");
         }

         const result = await upsertPetugasTerminal({
            terminal_id: activeTerminalId,
            nama: ptNama.trim(),
            pin: ptPin || undefined,
            petugas_id: ptEditId ?? undefined,
         });

         setPtSuccess(
            ptEditId
               ? "Data petugas berhasil diperbarui."
               : "Petugas baru berhasil ditambahkan.",
         );
         if (result.pin) setPtGeneratedPin(result.pin);
         setPtNama("");
         setPtPin("");
         setPtEditId(null);
         await loadPetugas();
      } catch (err: unknown) {
         setPtError(
            err instanceof Error ? err.message : "Gagal menyimpan data petugas",
         );
      } finally {
         setPtSaving(false);
      }
   };

   /* ─── Toggle aktif/nonaktif petugas ─── */
   const handleToggle = async (id: string, currentActive: boolean) => {
      try {
         await togglePetugasTerminal(id, !currentActive);
         await loadPetugas();
      } catch (err: unknown) {
         setPtError(
            err instanceof Error ? err.message : "Gagal mengubah status petugas",
         );
      }
   };

   const handleToggleDevice = async (row: DeviceRow) => {
      setDevActionId(row.id);
      setDevError(null);
      setDevSuccess(null);
      setGeneratedPassword(null);

      try {
         await updatePetugas({ id: row.id, is_active: !row.is_active });
         setDevSuccess(
            row.is_active
               ? "Akun loket berhasil dinonaktifkan."
               : "Akun loket berhasil diaktifkan.",
         );
         await loadDevices();
      } catch (err: unknown) {
         setDevError(
            err instanceof Error ? err.message : "Gagal mengubah status akun",
         );
      } finally {
         setDevActionId(null);
      }
   };

   const handleResetDevicePassword = async (row: DeviceRow) => {
      setDevActionId(row.id);
      setDevError(null);
      setDevSuccess(null);
      setGeneratedPassword(null);

      try {
         const result = await updatePetugas({
            id: row.id,
            reset_password: true,
         });
         setGeneratedPassword(result.password);
         setDevSuccess("Password akun loket berhasil direset.");
      } catch (err: unknown) {
         setDevError(
            err instanceof Error ? err.message : "Gagal mereset password akun",
         );
      } finally {
         setDevActionId(null);
      }
   };

   /* ─── Edit petugas ─── */
   const handleEdit = (row: PetugasTerminalRow) => {
      setPtEditId(row.id);
      setPtNama(row.nama);
      setPtPin("");
      setPtError(null);
      setPtSuccess(null);
   };

   const handleCancelEdit = () => {
      setPtEditId(null);
      setPtNama("");
      setPtPin("");
   };

   return (
      <div className="space-y-5">
         {terminalOptions.length > 0 && (
            <Card className="border-base-300">
               <CardContent className="pt-5">
                  <div className="max-w-md space-y-2">
                     <Label htmlFor="terminal-akun" className="text-[13px]">
                        Terminal
                     </Label>
                      <Select
                         value={activeTerminalId}
                         onValueChange={(v) => {
                            setActiveTerminalId(v);
                            setPtEditId(null);
                            setPtNama("");
                            setPtPin("");
                            setDevError(null);
                            setDevSuccess(null);
                            setGeneratedPassword(null);
                            setPtError(null);
                            setPtSuccess(null);
                            setPtGeneratedPin(null);
                         }}
                      >
                         <SelectTrigger id="terminal-akun">
                           <SelectValue placeholder="Pilih terminal" />
                         </SelectTrigger>
                         <SelectContent>
                            {terminalOptions.map((terminal) => (
                               <SelectItem key={terminal.id} value={terminal.id}>
                                  {terminal.kode} - {terminal.nama}
                               </SelectItem>
                            ))}
                         </SelectContent>
                      </Select>
                  </div>
               </CardContent>
            </Card>
         )}

      <Tabs defaultValue="petugas" className="space-y-4">
         <TabsList>
            <TabsTrigger value="petugas" className="gap-1.5">
               <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
               Data Petugas
            </TabsTrigger>
            <TabsTrigger value="loket" className="gap-1.5">
               <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
               Akun Loket
            </TabsTrigger>
         </TabsList>

         {/* ─── TAB: Data Petugas ─── */}
         <TabsContent value="petugas" className="space-y-6">
            <Card className="max-w-2xl border-base-300">
               <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                     <UserPlus className="h-4 w-4 text-primary" aria-hidden="true" />
                     {ptEditId ? "Edit Petugas" : "Tambah Petugas Baru"}
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  {ptError && (
                     <Alert variant="destructive" className="animate-fade-in">
                        <AlertTitle>Terjadi Kesalahan</AlertTitle>
                        <AlertDescription>{ptError}</AlertDescription>
                     </Alert>
                  )}
                  {ptSuccess && (
                     <Alert className="animate-fade-in bg-brand-green/10 border-brand-green/25 text-brand-green">
                        <AlertTitle>Berhasil</AlertTitle>
                        <AlertDescription>{ptSuccess}</AlertDescription>
                     </Alert>
                  )}
                  {ptGeneratedPin && (
                     <Alert className="animate-fade-in border border-primary/25 bg-primary/10 text-primary dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                        <AlertTitle>PIN Otomatis</AlertTitle>
                        <AlertDescription>
                           PIN petugas:{" "}
                           <code className="bg-primary/15 px-1.5 py-0.5 rounded text-[13px] font-mono font-semibold tracking-widest">
                              {ptGeneratedPin}
                           </code>
                        </AlertDescription>
                     </Alert>
                  )}

                  <p className="text-sm text-base-content/70">
                     Setiap petugas memiliki PIN unik untuk identifikasi saat
                     login di loket. Biarkan PIN kosong untuk menghasilkan PIN
                     otomatis.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                     <div className="space-y-2">
                        <Label htmlFor="pt-nama" className="text-[13px]">
                           Nama Petugas *
                        </Label>
                        <Input
                           id="pt-nama"
                           value={ptNama}
                           onChange={(e) => setPtNama(e.target.value)}
                           placeholder="Nama lengkap petugas"
                           className="h-10"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="pt-pin" className="text-[13px]">
                           PIN (4-6 digit) — kosongi untuk otomatis
                        </Label>
                        <Input
                           id="pt-pin"
                           inputMode="numeric"
                           maxLength={6}
                           value={ptPin}
                           onChange={(e) =>
                              setPtPin(e.target.value.replace(/\D/g, ""))
                           }
                           placeholder={ptEditId ? "PIN baru" : "Biarkan kosong"}
                           className="h-10"
                        />
                     </div>
                  </div>

                  <div className="flex gap-2">
                     <Button onClick={handleSavePetugas} disabled={ptSaving}>
                        {ptSaving ? (
                           <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                              Menyimpan…
                           </>
                        ) : ptEditId ? (
                           "Simpan Perubahan"
                        ) : (
                           "Tambah Petugas"
                        )}
                     </Button>
                     {ptEditId && (
                        <Button variant="outline" onClick={handleCancelEdit}>
                           Batal
                        </Button>
                     )}
                  </div>
               </CardContent>
            </Card>

            <Card className="border-base-300">
               <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                     <CardTitle className="text-base">Daftar Petugas</CardTitle>
                     <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadPetugas}
                        disabled={ptLoading}
                        className="h-8 gap-1.5 text-xs"
                     >
                        <RefreshCw
                           className={`h-3.5 w-3.5 ${ptLoading ? "animate-spin" : ""}`}
                         aria-hidden="true" />
                        Refresh
                     </Button>
                  </div>
               </CardHeader>
               <CardContent>
                   {ptLoading ? (
                      <LoadingState variant="inline" text="Memuat data…" />
                   ) : petugasList.length === 0 ? (
                     <div className="text-center py-8">
                        <p className="text-sm text-base-content/70">
                           Belum ada petugas. Tambahkan petugas baru di atas.
                        </p>
                     </div>
                  ) : (
                     <div className="border border-base-300 rounded-lg bg-base-100 overflow-hidden">
                        <Table caption="Daftar petugas terminal">
                           <TableHeader>
                              <TableRow className="bg-base-200/50">
                                 <TableHead className="text-[13px]">
                                    Nama
                                 </TableHead>
                                 <TableHead className="text-[13px]">
                                    Status
                                 </TableHead>
                                 <TableHead className="text-[13px]">
                                    Terdaftar
                                 </TableHead>
                                 <TableHead className="text-[13px] text-right">
                                    Aksi
                                 </TableHead>
                              </TableRow>
                           </TableHeader>
                           <TableBody>
                              {petugasList.map((row) => (
                                 <TableRow key={row.id}>
                                    <TableCell className="font-medium text-[13px]">
                                       {row.nama}
                                    </TableCell>
                                    <TableCell>
                                       <span
                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${row.is_active ? "bg-emerald-50 text-brand-green dark:bg-green-950/50 dark:text-green-300" : "bg-base-200 text-base-content/70"}`}
                                       >
                                          {row.is_active ? "Aktif" : "Nonaktif"}
                                       </span>
                                    </TableCell>
                                    <TableCell className="text-[13px] text-base-content/70">
                                       {formatDateTime(row.created_at)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                       <div className="flex items-center justify-end gap-1">
                                          <Button
                                             variant="ghost"
                                             size="sm"
                                             className="h-7 w-7 p-0"
                                             title="Edit petugas"
                                             aria-label="Edit petugas"
                                             onClick={() => handleEdit(row)}
                                          >
                                             <Pencil className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                             variant="ghost"
                                             size="sm"
                                             className={`h-7 w-7 p-0 ${row.is_active ? "text-accent hover:text-accent" : "text-brand-green hover:text-brand-green"}`}
                                             title={
                                                row.is_active
                                                   ? "Nonaktifkan"
                                                   : "Aktifkan"
                                             }
                                             aria-label={
                                                row.is_active
                                                   ? "Nonaktifkan"
                                                   : "Aktifkan"
                                             }
                                             onClick={() =>
                                                handleToggle(
                                                   row.id,
                                                   row.is_active,
                                                )
                                             }
                                          >
                                             <Power className="h-3.5 w-3.5" />
                                          </Button>
                                       </div>
                                    </TableCell>
                                 </TableRow>
                              ))}
                           </TableBody>
                        </Table>
                     </div>
                  )}
               </CardContent>
            </Card>
         </TabsContent>

         {/* ─── TAB: Akun Loket ─── */}
         <TabsContent value="loket" className="space-y-6">
            <Card className="max-w-2xl border-base-300">
               <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                     <Monitor className="h-4 w-4 text-primary" aria-hidden="true" />
                     Buat Akun Loket
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  {devError && (
                     <Alert variant="destructive" className="animate-fade-in">
                        <AlertTitle>Terjadi Kesalahan</AlertTitle>
                        <AlertDescription>{devError}</AlertDescription>
                     </Alert>
                  )}
                  {devSuccess && (
                     <Alert className="animate-fade-in bg-brand-green/10 border-brand-green/25 text-brand-green">
                        <AlertTitle>Berhasil</AlertTitle>
                        <AlertDescription>{devSuccess}</AlertDescription>
                     </Alert>
                  )}
                  {generatedPassword && (
                     <Alert className="animate-fade-in border border-primary/25 bg-primary/10 text-primary dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                        <AlertTitle>Password Otomatis</AlertTitle>
                        <AlertDescription>
                           Simpan password ini untuk login di device:{" "}
                           <code className="bg-primary/15 px-1.5 py-0.5 rounded text-[13px] font-mono font-semibold">
                              {generatedPassword}
                           </code>
                        </AlertDescription>
                     </Alert>
                  )}

                  <p className="text-sm text-base-content/70">
                     Akun loket digunakan untuk login di perangkat/device loket.
                     Setelah login, petugas memasukkan PIN pribadi untuk
                     identifikasi.
                  </p>

                  <div className="space-y-2">
                     <Label htmlFor="dev-label" className="text-[13px]">
                        Nama Loket *
                     </Label>
                     <Input
                        id="dev-label"
                        value={devLabel}
                        onChange={(e) => setDevLabel(e.target.value)}
                        placeholder="Loket 01"
                        className="h-10"
                     />
                  </div>

                  <div className="space-y-2">
                     <Label htmlFor="dev-email" className="text-[13px]">
                        Email (opsional)
                     </Label>
                     <Input
                        id="dev-email"
                        value={devEmail}
                        onChange={(e) => setDevEmail(e.target.value)}
                        placeholder="loket-01@terminal.local"
                        className="h-10"
                     />
                  </div>

                  <div className="space-y-2">
                     <Label htmlFor="dev-password" className="text-[13px]">
                        Password (opsional)
                     </Label>
                      <Input
                         id="dev-password"
                         type="password"
                         value={devPassword}
                         onChange={(e) => setDevPassword(e.target.value)}
                         placeholder="Isi untuk password manual"
                        className="h-10"
                     />
                  </div>

                  <Button onClick={handleCreateDevice} disabled={devSaving}>
                     {devSaving ? (
                        <>
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                           Membuat…
                        </>
                     ) : (
                        "Buat Akun Loket"
                     )}
                  </Button>
               </CardContent>
            </Card>

            <Card className="border-base-300">
               <CardHeader className="pb-4">
                  <CardTitle className="text-base">Daftar Akun Loket</CardTitle>
               </CardHeader>
               <CardContent>
                  {devLoading ? (
                     <div className="flex items-center gap-2 text-sm text-base-content/70">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Memuat data…
                     </div>
                  ) : devices.length === 0 ? (
                     <div className="text-center py-8">
                        <p className="text-sm text-base-content/70">
                           Belum ada akun loket.
                        </p>
                     </div>
                  ) : (
                     <div className="border border-base-300 rounded-lg bg-base-100 overflow-hidden">
                        <Table caption="Daftar akun operator terminal">
                           <TableHeader>
                              <TableRow className="bg-base-200/50">
                                 <TableHead className="text-[13px]">
                                    Nama Loket
                                 </TableHead>
                                 <TableHead className="text-[13px]">
                                    Email
                                 </TableHead>
                                 <TableHead className="text-[13px]">
                                    Status
                                 </TableHead>
                                  <TableHead className="text-[13px]">
                                     Dibuat
                                  </TableHead>
                                  <TableHead className="text-[13px] text-right">
                                     Aksi
                                  </TableHead>
                               </TableRow>
                            </TableHeader>
                            <TableBody>
                              {devices.map((row) => (
                                 <TableRow key={row.id}>
                                    <TableCell className="font-medium text-[13px]">
                                       {row.full_name ?? "-"}
                                    </TableCell>
                                    <TableCell className="text-[13px]">
                                       {row.email}
                                    </TableCell>
                                    <TableCell>
                                       <span
                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${row.is_active ? "bg-emerald-50 text-brand-green dark:bg-green-950/50 dark:text-green-300" : "bg-base-200 text-base-content/70"}`}
                                       >
                                          {row.is_active ? "Aktif" : "Nonaktif"}
                                       </span>
                                    </TableCell>
                                     <TableCell className="text-[13px] text-base-content/70">
                                        {formatDateTime(row.created_at)}
                                     </TableCell>
                                     <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                           <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0 text-primary hover:text-primary"
                                              title="Reset password"
                                              aria-label="Reset password"
                                              onClick={() =>
                                                 handleResetDevicePassword(row)
                                              }
                                              disabled={devActionId === row.id}
                                           >
                                              {devActionId === row.id ? (
                                                 <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                              ) : (
                                                 <KeyRound className="h-3.5 w-3.5" />
                                              )}
                                           </Button>
                                           <Button
                                              variant="ghost"
                                              size="sm"
                                              className={`h-7 w-7 p-0 ${row.is_active ? "text-accent hover:text-accent" : "text-brand-green hover:text-brand-green"}`}
                                              title={
                                                 row.is_active
                                                    ? "Nonaktifkan akun"
                                                    : "Aktifkan akun"
                                              }
                                              aria-label={
                                                 row.is_active
                                                    ? "Nonaktifkan akun"
                                                    : "Aktifkan akun"
                                              }
                                              onClick={() =>
                                                 handleToggleDevice(row)
                                              }
                                              disabled={devActionId === row.id}
                                           >
                                              <Power className="h-3.5 w-3.5" />
                                           </Button>
                                        </div>
                                     </TableCell>
                                  </TableRow>
                               ))}
                           </TableBody>
                        </Table>
                     </div>
                  )}
               </CardContent>
            </Card>
         </TabsContent>
      </Tabs>
      </div>
   );
}
