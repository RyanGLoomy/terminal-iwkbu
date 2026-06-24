"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setSessionError(true);
        return;
      }

      if (!data.session) {
        const hash = window.location.hash;
        if (hash && hash.includes("type=recovery")) {
          const params = new URLSearchParams(hash.replace("#", "?"));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken) {
            const { error: setError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken ?? "",
            });

            if (setError) {
              setSessionError(true);
              return;
            }

            setSessionReady(true);
            return;
          }
        }

        setSessionError(true);
        return;
      }

      setSessionReady(true);
    };

    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak sesuai.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ password }),
      });

      const payload = await res.json();

      if (!res.ok) {
         setError(payload?.message ?? "Terjadi kesalahan. Coba lagi.");
         return;
      }

      setSuccess(true);

      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center px-5 py-7 sm:px-8 sm:py-10">
      <div className="command-panel w-full max-w-[420px] rounded-3xl p-5 sm:p-7">
        {sessionError ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-8 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div className="space-y-1">
                <p className="font800 text-foreground">Tautan tidak valid</p>
                <p className="text-sm text-muted-foreground">
                  Tautan reset password tidak valid atau sudah kedaluwarsa.
                  Silakan ajukan reset password ulang.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2 text-[15px]"
              onClick={() => router.push("/lupa-password")}
            >
              Ajukan ulang reset password
            </Button>
          </div>
        ) : success ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand-green/30 bg-brand-green/5 px-5 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-brand-green" />
              <div className="space-y-1">
                <p className="font800 text-foreground">
                  Password berhasil diubah
                </p>
                <p className="text-sm text-muted-foreground">
                  Mengarahkan ke halaman masuk...
                </p>
              </div>
            </div>
          </div>
        ) : !sessionReady ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="mb-7 border-b border-border pb-6">
              <h2 className="text-heading text-foreground">Reset password</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Masukkan password baru untuk akun Anda.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2.5">
                <Label htmlFor="password">Password baru</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    autoFocus
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="confirm-password">Konfirmasi password baru</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Ketik ulang password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gap-2 text-[15px]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengubah password...
                  </>
                ) : (
                  "Ubah password"
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
