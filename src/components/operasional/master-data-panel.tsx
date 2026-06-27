"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Pencil, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JenisKendaraan, SystemSetting } from "@/lib/supabase/queries/operasional.types";

export type TerminalMasterRow = {
   id: string;
   kode: string;
   nama: string;
};

type MasterDataPanelProps = {
   initialTerminals: TerminalMasterRow[];
   initialJenisKendaraan?: JenisKendaraan[];
   initialSettings?: SystemSetting[];
   role: "admin-terminal" | "staf-iw";
};

const emptyForm = { id: "", kode: "", nama: "" };

function getErrorMessage(error: unknown) {
   return error instanceof Error ? error.message : "Terjadi kesalahan";
}

export function MasterDataPanel({ initialTerminals, initialJenisKendaraan, initialSettings, role }: MasterDataPanelProps) {
   const [terminals, setTerminals] = useState(initialTerminals);
   const [form, setForm] = useState(emptyForm);
   const [loading, setLoading] = useState(false);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const canCreateDelete = role === "staf-iw";
   const isEditing = Boolean(form.id);

   const [jenisList, setJenisList] = useState<JenisKendaraan[]>(initialJenisKendaraan ?? []);
   const [jenisForm, setJenisForm] = useState({ id: "", nama: "", kode: "", urutan: "0" });
   const [jenisSaving, setJenisSaving] = useState(false);
   const isJenisEditing = Boolean(jenisForm.id);

   const [settings, setSettings] = useState<SystemSetting[]>(initialSettings ?? []);
   const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>({});
   const [settingsSaving, setSettingsSaving] = useState(false);
   const showSettings = role === "staf-iw" && initialSettings;

   const resetForm = () => {
      setForm(emptyForm);
      setError(null);
   };

   const reloadTerminals = async () => {
      setLoading(true);
      setError(null);

      try {
         const response = await fetch("/api/admin/terminals");
         const payload = await response.json();

         if (!response.ok) {
            throw new Error(payload.message ?? "Gagal memuat terminal");
         }

         setTerminals(payload.data ?? []);
      } catch (err) {
         setError(getErrorMessage(err));
      } finally {
         setLoading(false);
      }
   };

   const saveTerminal = async () => {
      const kode = form.kode.trim().toUpperCase();
      const nama = form.nama.trim();

      if (!kode || !nama) {
         setError("Kode dan nama terminal wajib diisi");
         return;
      }

      if (!isEditing && !canCreateDelete) {
         setError("Admin terminal hanya dapat mengubah terminal aktifnya");
         return;
      }

      setSaving(true);
      setError(null);

      try {
         const response = await fetch("/api/admin/terminals", {
            method: isEditing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: form.id || undefined, kode, nama }),
         });
         const payload = await response.json();

         if (!response.ok) {
            throw new Error(payload.message ?? "Gagal menyimpan terminal");
         }

         toast.success("Terminal berhasil disimpan");
         resetForm();
         await reloadTerminals();
      } catch (err) {
         setError(getErrorMessage(err));
      } finally {
         setSaving(false);
      }
   };

   const deleteTerminal = async (terminal: TerminalMasterRow) => {
      if (!canCreateDelete) return;
      if (!window.confirm(`Hapus terminal ${terminal.kode} - ${terminal.nama}?`)) return;

      setLoading(true);
      setError(null);

      try {
         const response = await fetch(
            `/api/admin/terminals?id=${encodeURIComponent(terminal.id)}`,
            { method: "DELETE" },
         );
         const payload = await response.json();

         if (!response.ok) {
            throw new Error(payload.message ?? "Gagal menghapus terminal");
         }

         toast.success("Terminal berhasil dihapus");
         resetForm();
         await reloadTerminals();
      } catch (err) {
         setError(getErrorMessage(err));
      } finally {
         setLoading(false);
      }
   };

    const editTerminal = (terminal: TerminalMasterRow) => {
       setForm({ id: terminal.id, kode: terminal.kode, nama: terminal.nama });
       setError(null);
    };

    const reloadJenis = async () => {
       try {
          const res = await fetch("/api/admin/jenis-kendaraan");
          const payload = await res.json();
          if (res.ok) setJenisList(payload.data ?? []);
       } catch { /* silent */ }
    };

    const saveJenis = async () => {
       const nama = jenisForm.nama.trim();
       const kode = jenisForm.kode.trim().toUpperCase();
       const urutan = parseInt(jenisForm.urutan, 10) || 0;

       if (!nama || !kode) {
          toast.error("Nama dan kode wajib diisi");
          return;
       }

       setJenisSaving(true);
       try {
          const res = await fetch("/api/admin/jenis-kendaraan", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ nama, kode, urutan }),
          });
          const payload = await res.json();
          if (!res.ok) throw new Error(payload.message ?? "Gagal menyimpan");
          toast.success("Jenis kendaraan ditambahkan");
          setJenisForm({ id: "", nama: "", kode: "", urutan: "0" });
          await reloadJenis();
       } catch (err) {
          toast.error(getErrorMessage(err));
       } finally {
          setJenisSaving(false);
       }
    };

    const updateJenis = async () => {
       if (!jenisForm.id) return;
       const nama = jenisForm.nama.trim();
       const kode = jenisForm.kode.trim().toUpperCase();
       const urutan = parseInt(jenisForm.urutan, 10) || 0;

       if (!nama || !kode) {
          toast.error("Nama dan kode wajib diisi");
          return;
       }

       setJenisSaving(true);
       try {
          const res = await fetch(`/api/admin/jenis-kendaraan/${jenisForm.id}`, {
             method: "PATCH",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ nama, kode, urutan }),
          });
          const payload = await res.json();
          if (!res.ok) throw new Error(payload.message ?? "Gagal memperbarui");
          toast.success("Jenis kendaraan diperbarui");
          setJenisForm({ id: "", nama: "", kode: "", urutan: "0" });
          await reloadJenis();
       } catch (err) {
          toast.error(getErrorMessage(err));
       } finally {
          setJenisSaving(false);
       }
    };

    const deleteJenis = async (item: JenisKendaraan) => {
       if (!window.confirm(`Hapus jenis kendaraan ${item.nama}?`)) return;
       try {
          const res = await fetch(`/api/admin/jenis-kendaraan/${item.id}`, {
             method: "DELETE",
          });
          if (!res.ok) {
             const p = await res.json();
             throw new Error(p.message ?? "Gagal menghapus");
          }
          toast.success("Jenis kendaraan dihapus");
          await reloadJenis();
       } catch (err) {
          toast.error(getErrorMessage(err));
       }
    };

    const editJenis = (item: JenisKendaraan) => {
       setJenisForm({
          id: item.id,
          nama: item.nama,
          kode: item.kode,
          urutan: String(item.urutan),
       });
    };

    const saveSettings = async () => {
       const keys = Object.keys(settingsDraft);
       if (keys.length === 0) {
          toast.info("Tidak ada perubahan");
          return;
       }

       setSettingsSaving(true);
       try {
          const res = await fetch("/api/admin/system-settings", {
             method: "PUT",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify(
                keys.map((k) => ({ key: k, value: settingsDraft[k] })),
             ),
          });
          const payload = await res.json();
          if (!res.ok) throw new Error(payload.message ?? "Gagal menyimpan");

          setSettings((prev) =>
             prev.map((s) =>
                settingsDraft[s.key] !== undefined
                   ? { ...s, value: settingsDraft[s.key] }
                   : s,
             ),
          );
          setSettingsDraft({});
          toast.success(`${payload.updated} pengaturan diperbarui`);
       } catch (err) {
          toast.error(getErrorMessage(err));
       } finally {
          setSettingsSaving(false);
       }
    };

   return (
      <div className="space-y-5">
         <Card className="border-border">
            <CardHeader>
               <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                     <CardTitle className="text-base">Kelola Terminal</CardTitle>
                      <CardDescription>
                         {canCreateDelete
                            ? "Tambah, ubah, dan hapus master terminal."
                            : "Daftar terminal (read-only). Pengelolaan master data dilakukan oleh Staf IW."}
                      </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={reloadTerminals} disabled={loading}>
                     <RefreshCw className="h-4 w-4" />
                     Refresh
                  </Button>
               </div>
            </CardHeader>
            <CardContent className="space-y-4">
               {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 px-3 py-2 text-sm text-destructive">
                     <AlertCircle className="mt-0.5 h-4 w-4" />
                     <span>{error}</span>
                  </div>
               )}

                {canCreateDelete && (
                <div className="grid gap-3 rounded-2xl border border-border bg-muted/50 p-4 md:grid-cols-[160px_1fr_auto]">
                   <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-foreground">Kode</span>
                      <Input
                         value={form.kode}
                         onChange={(event) =>
                            setForm((current) => ({ ...current, kode: event.target.value.toUpperCase() }))
                         }
                         placeholder="JKT"
                         maxLength={20}
                      />
                   </label>
                   <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-foreground">Nama Terminal</span>
                      <Input
                         value={form.nama}
                         onChange={(event) =>
                            setForm((current) => ({ ...current, nama: event.target.value }))
                         }
                         placeholder="Terminal Kampung Rambutan"
                      />
                   </label>
                   <div className="flex items-end gap-2">
                      <Button onClick={saveTerminal} disabled={saving}>
                         {isEditing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                         {saving ? "Menyimpan..." : isEditing ? "Simpan" : "Tambah"}
                      </Button>
                      {isEditing && (
                         <Button variant="outline" onClick={resetForm} disabled={saving}>
                            Batal
                         </Button>
                      )}
                   </div>
                </div>
                )}

               <Table caption="Daftar terminal aktif">
                  <TableHeader>
                     <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Nama Terminal</TableHead>
                        <TableHead className="w-[180px]">Aksi</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {terminals.length === 0 ? (
                        <TableRow>
                           <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                              Belum ada terminal yang dapat ditampilkan.
                           </TableCell>
                        </TableRow>
                     ) : (
                        terminals.map((terminal) => (
                           <TableRow key={terminal.id}>
                              <TableCell className="font-semibold">{terminal.kode}</TableCell>
                              <TableCell>{terminal.nama}</TableCell>
                               <TableCell>
                                  <div className="flex flex-wrap gap-2">
                                     {canCreateDelete && (
                                        <Button variant="outline" size="sm" onClick={() => editTerminal(terminal)}>
                                           <Pencil className="h-4 w-4" />
                                           Edit
                                        </Button>
                                     )}
                                     {canCreateDelete && (
                                        <Button
                                           variant="destructive"
                                           size="sm"
                                           onClick={() => deleteTerminal(terminal)}
                                           disabled={loading}
                                        >
                                           <Trash2 className="h-4 w-4" />
                                           Hapus
                                        </Button>
                                     )}
                                     {!canCreateDelete && (
                                        <span className="text-xs text-muted-foreground">Read-only</span>
                                     )}
                                  </div>
                               </TableCell>
                           </TableRow>
                        ))
                     )}
                  </TableBody>
               </Table>
            </CardContent>
         </Card>

         {/* Jenis Kendaraan */}
         <Card className="border-border">
            <CardHeader>
               <CardTitle className="text-base">Jenis Kendaraan</CardTitle>
               <CardDescription>
                  {canCreateDelete
                     ? "Kelola kategori jenis kendaraan untuk klasifikasi armada."
                     : "Daftar jenis kendaraan yang tersedia."}
               </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               {canCreateDelete && (
                  <div className="grid gap-3 rounded-2xl border border-border bg-muted/50 p-4 md:grid-cols-[1fr_140px_100px_auto]">
                     <label className="space-y-1.5 text-sm">
                        <span className="font-semibold text-foreground">Nama</span>
                        <Input
                           value={jenisForm.nama}
                           onChange={(e) =>
                              setJenisForm((c) => ({ ...c, nama: e.target.value }))
                           }
                           placeholder="Bus Besar"
                        />
                     </label>
                     <label className="space-y-1.5 text-sm">
                        <span className="font-semibold text-foreground">Kode</span>
                        <Input
                           value={jenisForm.kode}
                           onChange={(e) =>
                              setJenisForm((c) => ({
                                 ...c,
                                 kode: e.target.value.toUpperCase(),
                              }))
                           }
                           placeholder="BUS_BESAR"
                        />
                     </label>
                     <label className="space-y-1.5 text-sm">
                        <span className="font-semibold text-foreground">Urutan</span>
                        <Input
                           type="number"
                           value={jenisForm.urutan}
                           onChange={(e) =>
                              setJenisForm((c) => ({ ...c, urutan: e.target.value }))
                           }
                        />
                     </label>
                     <div className="flex items-end gap-2">
                        <Button
                           onClick={isJenisEditing ? updateJenis : saveJenis}
                           disabled={jenisSaving}
                        >
                           {isJenisEditing ? (
                              <Pencil className="h-4 w-4" />
                           ) : (
                              <Plus className="h-4 w-4" />
                           )}
                           {jenisSaving ? "..." : isJenisEditing ? "Simpan" : "Tambah"}
                        </Button>
                        {isJenisEditing && (
                           <Button
                              variant="outline"
                               onClick={() =>
                                  setJenisForm({ id: "", nama: "", kode: "", urutan: "0" })
                               }
                              disabled={jenisSaving}
                           >
                              Batal
                           </Button>
                        )}
                     </div>
                  </div>
               )}

               <Table caption="Daftar jenis kendaraan">
                  <TableHeader>
                     <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Kode</TableHead>
                        <TableHead>Urutan</TableHead>
                        {canCreateDelete && <TableHead className="w-[140px]">Aksi</TableHead>}
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {jenisList.length === 0 ? (
                        <TableRow>
                           <TableCell
                              colSpan={canCreateDelete ? 4 : 3}
                              className="py-8 text-center text-sm text-muted-foreground"
                           >
                              Belum ada jenis kendaraan.
                           </TableCell>
                        </TableRow>
                     ) : (
                        jenisList.map((item) => (
                           <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.nama}</TableCell>
                              <TableCell>
                                 <Badge variant="secondary">{item.kode}</Badge>
                              </TableCell>
                              <TableCell>{item.urutan}</TableCell>
                              {canCreateDelete && (
                                 <TableCell>
                                    <div className="flex gap-2">
                                       <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => editJenis(item)}
                                       >
                                          <Pencil className="h-4 w-4" />
                                       </Button>
                                       <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => deleteJenis(item)}
                                       >
                                          <Trash2 className="h-4 w-4" />
                                       </Button>
                                    </div>
                                 </TableCell>
                              )}
                           </TableRow>
                        ))
                     )}
                  </TableBody>
               </Table>
            </CardContent>
         </Card>

         {/* System Settings */}
         {showSettings && (
            <Card className="border-border">
               <CardHeader>
                  <div className="flex items-center justify-between">
                     <div>
                        <CardTitle className="text-base">Pengaturan Sistem</CardTitle>
                        <CardDescription>
                            Konfigurasi aplikasi berbasis key-value.
                        </CardDescription>
                     </div>
                     <Button
                        size="sm"
                        onClick={saveSettings}
                        disabled={settingsSaving || Object.keys(settingsDraft).length === 0}
                     >
                        <Save className="h-4 w-4" />
                        {settingsSaving ? "Menyimpan..." : "Simpan"}
                     </Button>
                  </div>
               </CardHeader>
               <CardContent>
                  {settings.length === 0 ? (
                     <p className="py-4 text-center text-sm text-muted-foreground">
                        Belum ada pengaturan.
                     </p>
                  ) : (
                     <div className="space-y-4">
                        {Object.entries(
                           settings.reduce<Record<string, SystemSetting[]>>(
                              (acc, s) => {
                                 (acc[s.category] ??= []).push(s);
                                 return acc;
                              },
                              {},
                           ),
                        ).map(([cat, items]) => (
                           <div key={cat}>
                              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                 {cat}
                              </h4>
                              <div className="grid gap-3 sm:grid-cols-2">
                                 {items.map((s) => (
                                    <label
                                       key={s.key}
                                       className="space-y-1 text-sm"
                                    >
                                       <span className="flex items-center justify-between font-semibold text-foreground">
                                          {s.key.replace(/_/g, " ")}
                                          {settingsDraft[s.key] !== undefined &&
                                             settingsDraft[s.key] !== s.value && (
                                                <span className="text-xs text-accent">
                                                   Diubah
                                                </span>
                                             )}
                                       </span>
                                       <Input
                                          value={
                                             settingsDraft[s.key] !== undefined
                                                ? settingsDraft[s.key]
                                                : s.value
                                          }
                                          onChange={(e) =>
                                             setSettingsDraft((d) => ({
                                                ...d,
                                                [s.key]: e.target.value,
                                             }))
                                          }
                                       />
                                       {s.description && (
                                          <span className="text-xs text-muted-foreground">
                                             {s.description}
                                          </span>
                                       )}
                                    </label>
                                 ))}
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </CardContent>
            </Card>
         )}
      </div>
   );
}
