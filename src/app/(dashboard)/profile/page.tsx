"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
   Loader2,
   User,
   Mail,
   Shield,
   Lock,
   KeyRound,
   Eye,
   EyeOff,
   Check,
   AlertCircle,
} from "lucide-react";
import { ROLE_DISPLAY_NAMES, type RoleType } from "@/config/roles";
import { cn } from "@/lib/utils";
import { getPinSession } from "@/lib/supabase/queries/operasional.client";
import {
   getRoleNameFromProfile,
   normalizeRoleName,
} from "@/lib/supabase/role-utils";
import { getErrorMessage } from "@/lib/db-error";

/* ────────────────────── types ────────────────────── */

interface ProfileData {
   id: string;
   full_name: string | null;
   email: string;
   terminal_id: string | null;
   role: string | null;
   roleName: string | null;
}

interface PetugasIdentity {
   nama: string;
   petugasTerminalId: string;
}

type Msg = { type: "success" | "error"; text: string } | null;

/* ────────────────────── helpers ────────────────────── */

function getInitials(name: string | null, email: string) {
   if (name) {
      return name
         .split(" ")
         .map((w) => w[0])
         .join("")
         .toUpperCase()
         .slice(0, 2);
   }
   return email.slice(0, 2).toUpperCase();
}

function MsgAlert({ msg }: { msg: Msg }) {
   if (!msg) return null;
   const isError = msg.type === "error";
   return (
      <div
         className={cn(
            "flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm animate-fade-in",
            isError
               ? "border-red-200/60 bg-red-50/80 text-error dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-400"
               : "border-emerald-200/60 bg-emerald-50/80 text-brand-green dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400",
         )}
      >
         {isError ? (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
         ) : (
            <Check className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
         )}
         <span>{msg.text}</span>
      </div>
   );
}

/* ────────────────────── page ────────────────────── */

export default function ProfilePage() {
   /* ── profile state ── */
   const [profile, setProfile] = useState<ProfileData | null>(null);
   const [loading, setLoading] = useState(true);
   const [loadError, setLoadError] = useState<string | null>(null);
   const [fullName, setFullName] = useState("");
   const [savingProfile, setSavingProfile] = useState(false);
   const [profileMsg, setProfileMsg] = useState<Msg>(null);

   /* ── password state ── */
   const [currentPassword, setCurrentPassword] = useState("");
   const [newPassword, setNewPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [savingPassword, setSavingPassword] = useState(false);
   const [passwordMsg, setPasswordMsg] = useState<Msg>(null);
   const [showCurrentPw, setShowCurrentPw] = useState(false);
   const [showNewPw, setShowNewPw] = useState(false);

   /* ── pin state (loket only) ── */
   const [currentPin, setCurrentPin] = useState("");
   const [newPin, setNewPin] = useState("");
   const [confirmPin, setConfirmPin] = useState("");
   const [savingPin, setSavingPin] = useState(false);
   const [pinMsg, setPinMsg] = useState<Msg>(null);

   /* ── petugas identity (from PIN session) ── */
   const [petugasIdentity, setPetugasIdentity] =
      useState<PetugasIdentity | null>(null);

   /* ── load profile ── */
   useEffect(() => {
      const load = async () => {
         const supabase = createClient();
         const {
            data: { user },
         } = await supabase.auth.getUser();
         if (!user) {
            setLoadError("Sesi habis. Silakan login ulang.");
            setLoading(false);
            return;
         }

         const { data, error } = await supabase
            .from("profiles")
            .select(
               "id, full_name, email, terminal_id, user_roles!inner(role:roles(name))",
            )
            .eq("id", user.id)
            .single();

         if (error || !data) {
            setLoadError(error?.message ?? "Data profil tidak ditemukan.");
            setLoading(false);
            return;
         }

         const normalizedRole =
            normalizeRoleName(getRoleNameFromProfile(data)) ?? null;

         setProfile({
            id: data.id,
            full_name: data.full_name,
            email: data.email,
            terminal_id: data.terminal_id,
            role: normalizedRole,
            roleName: normalizedRole
               ? (ROLE_DISPLAY_NAMES[normalizedRole as RoleType] ??
                 normalizedRole)
               : null,
         });
         setFullName(data.full_name ?? "");

         // For loket, fetch the actual petugas identity from PIN session
         if (normalizedRole === "loket") {
            try {
               const pinSession = await getPinSession();
               if (
                  pinSession?.petugas_nama &&
                  pinSession?.petugas_terminal_id
               ) {
                  setPetugasIdentity({
                     nama: pinSession.petugas_nama,
                     petugasTerminalId: pinSession.petugas_terminal_id,
                  });
               }
            } catch {
               // PIN session may not exist yet — that's fine
            }
         }

         setLoading(false);
      };

      load();
   }, []);

   const canEditName = profile?.role !== "loket";
   const isPetugas = profile?.role === "loket";

   // Display name: petugas name from PIN session if available, otherwise loket name
   const displayName =
      isPetugas && petugasIdentity
         ? petugasIdentity.nama
         : profile?.full_name || profile?.email || "";
   const displayInitials =
      isPetugas && petugasIdentity
         ? getInitials(petugasIdentity.nama, profile?.email ?? "")
         : getInitials(profile?.full_name ?? null, profile?.email ?? "");

   /* ── save profile ── */
   const handleSaveProfile = async () => {
      if (!profile || !canEditName) return;
      setSavingProfile(true);
      setProfileMsg(null);

         try {
          if (fullName.trim() === (profile.full_name ?? "")) {
             setProfileMsg({ type: "success", text: "Tidak ada perubahan." });
             return;
          }

          const res = await fetch("/api/profile", {
             method: "PATCH",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ full_name: fullName.trim() }),
          });

          if (!res.ok) {
             const json = await res.json();
             throw new Error(json.message ?? "Gagal menyimpan profil.");
          }

         setProfile((prev) =>
            prev ? { ...prev, full_name: fullName.trim() || null } : prev,
         );
         setProfileMsg({
            type: "success",
            text: "Profil berhasil diperbarui.",
         });
      } catch (err: unknown) {
         setProfileMsg({
            type: "error",
            text: getErrorMessage(err),
         });
      } finally {
         setSavingProfile(false);
      }
   };

   /* ── change password ── */
   const handleChangePassword = async () => {
      setSavingPassword(true);
      setPasswordMsg(null);

      try {
         if (!currentPassword || !newPassword) {
            throw new Error("Semua kolom password wajib diisi.");
         }
         if (newPassword.length < 6) {
            throw new Error("Password baru minimal 6 karakter.");
         }
         if (newPassword !== confirmPassword) {
            throw new Error("Konfirmasi password tidak cocok.");
         }

         const res = await fetch("/api/auth/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword, newPassword }),
         });

         const json = await res.json();
         if (!res.ok)
            throw new Error(json.message ?? "Gagal mengubah password.");

         setCurrentPassword("");
         setNewPassword("");
         setConfirmPassword("");
         setShowCurrentPw(false);
         setShowNewPw(false);
         setPasswordMsg({
            type: "success",
            text: "Password berhasil diperbarui.",
         });
      } catch (err: unknown) {
         setPasswordMsg({
            type: "error",
            text: getErrorMessage(err),
         });
      } finally {
         setSavingPassword(false);
      }
   };

   /* ── change pin ── */
   const handleChangePin = async () => {
      setSavingPin(true);
      setPinMsg(null);

      try {
         if (!currentPin || !newPin) {
            throw new Error("Semua kolom PIN wajib diisi.");
         }
         if (!/^\d{4,6}$/.test(newPin)) {
            throw new Error("PIN baru harus 4–6 digit angka.");
         }
         if (newPin !== confirmPin) {
            throw new Error("Konfirmasi PIN tidak cocok.");
         }

         const res = await fetch("/api/auth/change-pin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPin, newPin }),
         });

         const json = await res.json();
         if (!res.ok) throw new Error(json.message ?? "Gagal mengubah PIN.");

         setCurrentPin("");
         setNewPin("");
         setConfirmPin("");
         setPinMsg({ type: "success", text: "PIN berhasil diperbarui." });
      } catch (err: unknown) {
         setPinMsg({
            type: "error",
            text: getErrorMessage(err),
         });
      } finally {
         setSavingPin(false);
      }
   };

   /* ── loading / error states ── */
   if (loading) {
      return (
         <div className="flex items-center gap-2 text-sm text-base-content/70 p-8 animate-fade-in">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Memuat profil…
         </div>
      );
   }

   if (!profile) {
      return (
         <div className="p-8">
            <Alert variant="destructive">
               <AlertDescription>
                  {loadError ?? "Profil tidak ditemukan."}
               </AlertDescription>
            </Alert>
         </div>
      );
   }

   /* ── render ── */
   return (
      <section className="space-y-6">
         <div className="space-y-6 max-w-2xl">
            {/* ── Page Header ── */}
            <div>
                <h1 className="text-xl font-bold tracking-tight text-base-content">
                  Kelola Profil
               </h1>
               <p className="text-sm text-base-content/70 mt-1">
                  Kelola informasi akun dan keamanan Anda.
               </p>
            </div>

            {/* ── Profile Card ── */}
            <Card className="border-base-300 overflow-hidden">
               {/* profile header with accent */}
               <div className="h-24 bg-gradient-to-r from-primary/80 to-primary/50" />
               <div className="px-6 -mt-8">
                  <div className="flex items-end gap-4">
                     {/* avatar */}
                     <div className="h-16 w-16 rounded-2xl bg-base-100 shadow-md border border-base-300/80 dark:border-base-300 flex items-center justify-center text-lg font-bold text-primary select-none shrink-0">
                        {displayInitials}
                     </div>
                  </div>
                  <div className="mt-3 mb-5">
                      <h2 className="text-lg font-semibold text-base-content">
                        {displayName}
                     </h2>
                     {isPetugas && petugasIdentity && (
                        <p className="text-xs text-base-content/70 mt-0.5">
                           Loket: {profile.full_name || profile.email}
                        </p>
                     )}
                     <span className="inline-block mt-1.5 rounded-md bg-primary text-primary-content text-xs font-medium px-3 py-1">
                        {isPetugas && petugasIdentity
                           ? "Petugas Terminal"
                           : (profile.roleName ?? "Tidak diketahui")}
                     </span>
                  </div>
               </div>

               <CardContent className="pt-4 space-y-5">
                  <MsgAlert msg={profileMsg} />

                  {/* email */}
                  <div className="space-y-1.5">
                     <Label className="text-[13px] flex items-center gap-1.5 text-base-content/70">
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        Email
                     </Label>
                     <p className="text-sm text-base-content dark:text-base-content/70/50 pl-5">
                        {profile.email}
                     </p>
                  </div>

                  {/* divider */}
                  <div className="border-t border-base-300 dark:border-base-300" />

                  {/* full name */}
                  <div className="space-y-1.5">
                     <Label
                        htmlFor="fullName"
                        className="text-[13px] flex items-center gap-1.5 text-base-content/70"
                     >
                        <User className="h-3.5 w-3.5" aria-hidden="true" />
                        {isPetugas ? "Nama Petugas" : "Nama Lengkap"}
                     </Label>
                     {canEditName ? (
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="h-10"
                            autoFocus
                            placeholder="Masukkan nama lengkap"
                         />
                     ) : (
                        <p className="text-sm text-base-content dark:text-base-content/70/50 pl-5">
                           {isPetugas && petugasIdentity
                              ? petugasIdentity.nama
                              : profile.full_name || "—"}
                        </p>
                     )}
                  </div>

                  {canEditName && (
                     <div className="pt-1">
                        <Button
                           onClick={handleSaveProfile}
                           disabled={savingProfile}
                           size="sm"
                        >
                           {savingProfile && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                           )}
                           Simpan Perubahan
                        </Button>
                     </div>
                  )}
               </CardContent>
            </Card>

            {/* ── Change Password Card ── */}
            <Card className="border-base-300">
               <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                     <Lock className="h-4 w-4 text-base-content/70" />
                     Ganti Password
                  </CardTitle>
                  <CardDescription>
                     {isPetugas
                        ? "Perbarui password akun loket. Hubungi admin jika Anda tidak mengetahui password."
                        : "Perbarui password akun Anda. Gunakan minimal 6 karakter."}
                  </CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                  <MsgAlert msg={passwordMsg} />

                  {/* current password */}
                  <div className="space-y-1.5">
                     <Label
                        htmlFor="currentPassword"
                        className="text-[13px] text-base-content/70"
                     >
                        Password Saat Ini
                     </Label>
                     <div className="relative">
                        <Input
                           id="currentPassword"
                           type={showCurrentPw ? "text" : "password"}
                           value={currentPassword}
                           onChange={(e) => setCurrentPassword(e.target.value)}
                           className="h-10 pr-10"
                           placeholder="Masukkan password saat ini"
                        />
                        <button
                           type="button"
                           tabIndex={-1}
                           onClick={() => setShowCurrentPw((v) => !v)}
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/70 hover:text-base-content transition-colors"
                        >
                           {showCurrentPw ? (
                              <EyeOff className="h-4 w-4" />
                           ) : (
                              <Eye className="h-4 w-4" />
                           )}
                        </button>
                     </div>
                  </div>

                  {/* new password */}
                  <div className="space-y-1.5">
                     <Label
                        htmlFor="newPassword"
                        className="text-[13px] text-base-content/70"
                     >
                        Password Baru
                     </Label>
                     <div className="relative">
                        <Input
                           id="newPassword"
                           type={showNewPw ? "text" : "password"}
                           value={newPassword}
                           onChange={(e) => setNewPassword(e.target.value)}
                           className="h-10 pr-10"
                           placeholder="Minimal 6 karakter"
                        />
                        <button
                           type="button"
                           tabIndex={-1}
                           onClick={() => setShowNewPw((v) => !v)}
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/70 hover:text-base-content transition-colors"
                        >
                           {showNewPw ? (
                              <EyeOff className="h-4 w-4" />
                           ) : (
                              <Eye className="h-4 w-4" />
                           )}
                        </button>
                     </div>
                  </div>

                  {/* confirm password */}
                  <div className="space-y-1.5">
                     <Label
                        htmlFor="confirmPassword"
                        className="text-[13px] text-base-content/70"
                     >
                        Konfirmasi Password Baru
                     </Label>
                      <Input
                         id="confirmPassword"
                         type={showNewPw ? "text" : "password"}
                         value={confirmPassword}
                         onChange={(e) => setConfirmPassword(e.target.value)}
                         className="h-10"
                         placeholder="Ketik ulang password baru"
                      />
                  </div>

                  <div className="pt-1">
                     <Button
                        onClick={handleChangePassword}
                        disabled={savingPassword}
                        variant="outline"
                        size="sm"
                        className="border-base-300"
                     >
                        {savingPassword && (
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        )}
                        Perbarui Password
                     </Button>
                  </div>
               </CardContent>
            </Card>

            {/* ── Change PIN Card (Petugas Loket only) ── */}
            {isPetugas && (
               <Card className="border-base-300">
                  <CardHeader className="pb-3">
                     <CardTitle className="text-base flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-base-content/70" aria-hidden="true" />
                        Ganti PIN
                     </CardTitle>
                     <CardDescription>
                        Ubah PIN petugas Anda. Gunakan 4–6 digit angka.
                     </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <MsgAlert msg={pinMsg} />

                     {/* current pin */}
                     <div className="space-y-1.5">
                        <Label
                           htmlFor="currentPin"
                           className="text-[13px] text-base-content/70"
                        >
                           PIN Saat Ini
                        </Label>
                        <Input
                            id="currentPin"
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={currentPin}
                            onChange={(e) =>
                               setCurrentPin(e.target.value.replace(/\D/g, ""))
                            }
                            className="h-10 tracking-[0.25em]"
                            placeholder="••••"
                         />
                     </div>

                     {/* new pin */}
                     <div className="space-y-1.5">
                        <Label
                           htmlFor="newPin"
                           className="text-[13px] text-base-content/70"
                        >
                           PIN Baru
                        </Label>
                        <Input
                            id="newPin"
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={newPin}
                            onChange={(e) =>
                               setNewPin(e.target.value.replace(/\D/g, ""))
                            }
                            className="h-10 tracking-[0.25em]"
                            placeholder="4–6 digit angka"
                         />
                     </div>

                     {/* confirm pin */}
                     <div className="space-y-1.5">
                        <Label
                           htmlFor="confirmPin"
                           className="text-[13px] text-base-content/70"
                        >
                           Konfirmasi PIN Baru
                        </Label>
                        <Input
                            id="confirmPin"
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                           value={confirmPin}
                           onChange={(e) =>
                              setConfirmPin(e.target.value.replace(/\D/g, ""))
                           }
                           className="h-10 tracking-[0.25em]"
                           placeholder="Ketik ulang PIN baru"
                        />
                     </div>

                     <div className="pt-1">
                        <Button
                           onClick={handleChangePin}
                           disabled={savingPin}
                           variant="outline"
                           size="sm"
                           className="border-base-300"
                        >
                           {savingPin && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                           )}
                           Perbarui PIN
                        </Button>
                     </div>
                  </CardContent>
               </Card>
            )}
         </div>
      </section>
   );
}
