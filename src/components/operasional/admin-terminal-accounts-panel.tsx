"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ShieldCheck, UserPlus, KeyRound, Power, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
   listAdminTerminalAccounts,
   createAdminTerminalAccount,
   updateAdminTerminalAccount,
   type AdminTerminalAccountRow,
} from "@/lib/supabase/queries/admin-terminal-accounts.client";

type TerminalOption = { id: string; kode: string; nama: string };

export function AdminTerminalAccountsPanel({
   terminalOptions,
}: {
   terminalOptions: TerminalOption[];
}) {
   const [accounts, setAccounts] = useState<AdminTerminalAccountRow[]>([]);
   const [loading, setLoading] = useState(true);
   const [creating, setCreating] = useState(false);
   const [busyId, setBusyId] = useState<string | null>(null);

   const [fullName, setFullName] = useState("");
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [role, setRole] = useState<"admin-terminal" | "staf-iw">("admin-terminal");
   const [terminalId, setTerminalId] = useState(
      terminalOptions[0]?.id ?? "",
   );

   const [createdCreds, setCreatedCreds] = useState<{
      email: string;
      password: string;
   } | null>(null);
   const [copied, setCopied] = useState(false);

   const load = useCallback(async () => {
      try {
         const data = await listAdminTerminalAccounts();
         setAccounts(data);
      } catch (err) {
         toast.error(
            err instanceof Error ? err.message : "Gagal memuat akun admin terminal",
         );
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      load();
   }, [load]);

   async function handleCreate(e: React.FormEvent) {
      e.preventDefault();
      if (!fullName.trim()) {
         toast.error("Nama lengkap wajib diisi");
         return;
      }
      if (role === "admin-terminal" && !terminalId) {
         toast.error("Terminal wajib dipilih untuk admin terminal");
         return;
      }
      setCreating(true);
      try {
         const result = await createAdminTerminalAccount({
            full_name: fullName.trim(),
            role,
            terminal_id: role === "admin-terminal" ? terminalId : undefined,
            email: email.trim() || undefined,
            password: password || undefined,
         });
         toast.success(`Akun ${role === "staf-iw" ? "Staf IW" : "Admin Terminal"} berhasil dibuat`);
         setCreatedCreds({
            email: result.email ?? email.trim(),
            password: result.password ?? password,
         });
         setFullName("");
         setEmail("");
         setPassword("");
         await load();
      } catch (err) {
         toast.error(
            err instanceof Error ? err.message : "Gagal membuat akun",
         );
      } finally {
         setCreating(false);
      }
   }

   async function toggleActive(account: AdminTerminalAccountRow) {
      setBusyId(account.id);
      try {
         const next = !account.is_active;
         await updateAdminTerminalAccount({ id: account.id, is_active: next });
         toast.success(next ? "Akun diaktifkan" : "Akun dinonaktifkan");
         await load();
      } catch (err) {
         toast.error(err instanceof Error ? err.message : "Gagal mengubah status");
      } finally {
         setBusyId(null);
      }
   }

   async function handleResetPassword(account: AdminTerminalAccountRow) {
      if (!confirm(`Reset password akun ${account.email}?`)) return;
      setBusyId(account.id);
      try {
         const result = await updateAdminTerminalAccount({
            id: account.id,
            reset_password: true,
         });
         if (result.password) {
            setCreatedCreds({ email: account.email, password: result.password });
         }
         toast.success("Password berhasil direset");
      } catch (err) {
         toast.error(err instanceof Error ? err.message : "Gagal reset password");
      } finally {
         setBusyId(null);
      }
   }

   function copyCreds() {
      if (!createdCreds) return;
      navigator.clipboard
         ?.writeText(`${createdCreds.email} / ${createdCreds.password}`)
         .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
         })
         .catch(() => toast.error("Gagal menyalin"));
   }

   return (
      <div className="space-y-6">
         {/* Form buat akun admin terminal */}
         <Card>
             <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                   <UserPlus className="size-4 text-primary" />
                   Tambah Akun Admin Terminal / Staf IW
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
                   <div className="space-y-2">
                      <Label htmlFor="ad-role">Peran (Role)</Label>
                      <Select value={role} onValueChange={(v) => setRole(v as "admin-terminal" | "staf-iw")}>
                         <SelectTrigger id="ad-role">
                            <SelectValue placeholder="Pilih peran" />
                         </SelectTrigger>
                         <SelectContent>
                            <SelectItem value="admin-terminal">Admin Terminal</SelectItem>
                            <SelectItem value="staf-iw">Staf IW</SelectItem>
                         </SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-2">
                      <Label htmlFor="ad-full">Nama lengkap</Label>
                      <Input
                         id="ad-full"
                         value={fullName}
                         onChange={(e) => setFullName(e.target.value)}
                         placeholder={role === "staf-iw" ? "Nama staf IW" : "Nama admin terminal"}
                         required
                      />
                   </div>
                   {role === "admin-terminal" && (
                   <div className="space-y-2">
                      <Label htmlFor="ad-terminal">Terminal</Label>
                      <Select
                         value={terminalId}
                         onValueChange={setTerminalId}
                      >
                         <SelectTrigger id="ad-terminal">
                            <SelectValue placeholder="Pilih terminal" />
                         </SelectTrigger>
                         <SelectContent>
                            {terminalOptions.map((t) => (
                               <SelectItem key={t.id} value={t.id}>
                                  {t.kode} — {t.nama}
                               </SelectItem>
                            ))}
                         </SelectContent>
                      </Select>
                   </div>
                   )}
                  <div className="space-y-2">
                     <Label htmlFor="ad-email">
                        Email{" "}
                        <span className="text-xs font-normal text-base-content/50">
                           (opsional — kosongkan untuk auto-generate)
                        </span>
                     </Label>
                     <Input
                        id="ad-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@terminal.local"
                     />
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="ad-pass">
                        Password{" "}
                        <span className="text-xs font-normal text-base-content/50">
                           (opsional — min 8 karakter)
                        </span>
                     </Label>
                     <Input
                        id="ad-pass"
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Kosongkan untuk auto-generate"
                     />
                  </div>
                  <div className="sm:col-span-2">
                     <Button type="submit" disabled={creating}>
                        {creating ? "Memproses..." : "Buat Akun"}
                     </Button>
                  </div>
               </form>

               {createdCreds && (
                  <div className="mt-4 rounded-box border border-base-300 bg-base-200 p-4">
                     <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm">
                           <p className="font-semibold">Kredensial akun baru</p>
                           <p className="text-base-content/70">
                              Email: <span className="font-mono">{createdCreds.email}</span>
                           </p>
                           <p className="text-base-content/70">
                              Password:{" "}
                              <span className="font-mono">{createdCreds.password}</span>
                           </p>
                           <p className="mt-1 text-xs text-base-content/50">
                              Salin &amp; berikan ke admin terminal. Password tidak ditampilkan lagi.
                           </p>
                        </div>
                        <div className="flex gap-2">
                           <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={copyCreds}
                           >
                              {copied ? (
                                 <Check className="size-4" />
                              ) : (
                                 <Copy className="size-4" />
                              )}
                              Salin
                           </Button>
                           <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setCreatedCreds(null)}
                           >
                              Tutup
                           </Button>
                        </div>
                     </div>
                  </div>
               )}
            </CardContent>
         </Card>

         {/* Daftar akun admin terminal */}
         <Card>
            <CardHeader className="pb-4">
               <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="size-4 text-primary" />
                  Daftar Akun Admin Terminal &amp; Staf IW
               </CardTitle>
            </CardHeader>
            <CardContent>
               {loading ? (
                  <p className="py-6 text-center text-sm text-base-content/60">
                     Memuat data...
                  </p>
               ) : accounts.length === 0 ? (
                  <EmptyState
                     title="Belum ada akun admin terminal"
                     icon={ShieldCheck}
                     className="border-0 py-6"
                  />
               ) : (
                  <Table caption="Daftar akun admin terminal">
                     <TableHeader>
                        <TableRow>
                           <TableHead>Nama</TableHead>
                           <TableHead>Email</TableHead>
                           <TableHead>Peran</TableHead>
                           <TableHead>Terminal</TableHead>
                           <TableHead>Status</TableHead>
                           <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {accounts.map((acc) => (
                           <TableRow key={acc.id}>
                              <TableCell className="font-medium">
                                 {acc.full_name || "-"}
                              </TableCell>
                              <TableCell className="text-base-content/70">
                                 {acc.email}
                              </TableCell>
                              <TableCell>
                                 <Badge
                                    className={
                                       (acc.user_roles?.[0]?.role?.name ?? "").replace(/_/g, "-") === "staf-iw"
                                          ? "badge-secondary"
                                          : "badge-primary"
                                    }
                                 >
                                    {(acc.user_roles?.[0]?.role?.name ?? "-").replace(/_/g, "-")}
                                 </Badge>
                              </TableCell>
                              <TableCell className="text-base-content/70">
                                 {acc.terminal
                                    ? `${acc.terminal.kode} — ${acc.terminal.nama}`
                                    : "-"}
                              </TableCell>
                              <TableCell>
                                 <Badge
                                    className={
                                       acc.is_active
                                          ? "badge-success"
                                          : "badge-error"
                                    }
                                 >
                                    {acc.is_active ? "Aktif" : "Nonaktif"}
                                 </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                 <div className="flex justify-end gap-1">
                                    <Button
                                       variant="ghost"
                                       size="icon-sm"
                                       title="Reset password"
                                       onClick={() => handleResetPassword(acc)}
                                       disabled={busyId === acc.id}
                                    >
                                       <KeyRound className="size-4" />
                                    </Button>
                                    <Button
                                       variant="ghost"
                                       size="icon-sm"
                                       title={
                                          acc.is_active ? "Nonaktifkan" : "Aktifkan"
                                       }
                                       onClick={() => toggleActive(acc)}
                                       disabled={busyId === acc.id}
                                    >
                                       <Power className="size-4" />
                                    </Button>
                                 </div>
                              </TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               )}
            </CardContent>
         </Card>
      </div>
   );
}
