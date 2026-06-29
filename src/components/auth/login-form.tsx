"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
   Loader2,
   AlertCircle,
   LogIn,
   Mail,
   LockKeyhole,
   Eye,
   EyeOff,
} from "lucide-react";

export function LoginForm() {
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [showPassword, setShowPassword] = useState(false);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!email.trim() || !password) {
         setError("Email dan password wajib diisi.");
         return;
      }

      setLoading(true);
      setError(null);

      try {
         const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password }),
         });

         const result = (await response.json().catch(() => ({}))) as {
            message?: string;
            defaultRoute?: string;
         };

         if (!response.ok) {
            setError(result.message ?? "Terjadi kesalahan. Silakan coba lagi.");
            return;
         }

         if (!result.defaultRoute) {
            setError(
               "Login berhasil, tetapi tujuan dashboard tidak ditemukan. Hubungi admin.",
            );
            return;
         }

         window.location.href = result.defaultRoute;
      } catch {
         setError("Tidak bisa terhubung ke server login. Coba lagi sebentar lagi.");
      } finally {
         setLoading(false);
      }
   };

   return (
      <form onSubmit={handleLogin} className="space-y-5">
         {error && (
            <Alert variant="destructive">
               <AlertCircle className="h-4 w-4" aria-hidden="true" />
               <AlertDescription>{error}</AlertDescription>
            </Alert>
         )}

         <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="input input-bordered flex h-12 w-full items-center gap-2">
                <Mail className="size-4 shrink-0 text-base-content/70" aria-hidden="true" />
                <input
                   id="email"
                   type="email"
                   name="email"
                   autoComplete="email"
                   autoCapitalize="none"
                   spellCheck={false}
                   autoFocus
                   placeholder="nama@perusahaan.com"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   required
                   disabled={loading}
                   className="min-w-0 grow bg-transparent text-sm outline-none placeholder:text-base-content/40"
                />
             </div>
         </div>

         <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="input input-bordered flex h-12 w-full items-center gap-2">
                <LockKeyhole className="size-4 shrink-0 text-base-content/70" aria-hidden="true" />
                <input
                   id="password"
                   name="password"
                   type={showPassword ? "text" : "password"}
                   autoComplete="current-password"
                   placeholder="Masukkan password"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   required
                   disabled={loading}
                   className="min-w-0 grow bg-transparent text-sm outline-none placeholder:text-base-content/40"
                />
                <button
                   type="button"
                   onClick={() => setShowPassword((s) => !s)}
                   className="text-base-content/70 transition-colors hover:text-base-content"
                   aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                   tabIndex={0}
                >
                   {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                   ) : (
                      <Eye className="size-4" aria-hidden="true" />
                   )}
                </button>
             </div>
            <div className="flex justify-end">
               <Link
                  href="/lupa-password"
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
               >
                  Lupa password?
               </Link>
            </div>
         </div>

         <Button
            type="submit"
            className="w-full gap-2 text-[15px]"
            disabled={loading}
         >
            {loading ? (
               <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Memproses…
               </>
            ) : (
               <>
                  <LogIn className="size-4" aria-hidden="true" />
                  Masuk
               </>
            )}
         </Button>

         <p className="text-center text-sm text-base-content/70">
            Belum punya akun PO?{" "}
            <Link
               href="/registrasi-po"
               className="font-semibold text-primary underline-offset-4 hover:underline"
            >
               Daftar di sini
            </Link>
         </p>
      </form>
   );
}
