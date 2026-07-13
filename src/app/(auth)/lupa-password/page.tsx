"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  Mail,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

export default function LupaPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSent(false);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!response.ok) {
        setError(result.message ?? "Terjadi kesalahan. Coba lagi.");
        return;
      }

      setSent(true);
    } catch {
      setError("Tidak bisa terhubung ke server. Coba lagi sebentar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center px-5 py-7 sm:px-8 sm:py-10">
      <div className="command-panel w-full max-w-[420px] rounded-3xl p-5 sm:p-7">
        <div className="mb-7 border-b border-base-300 pb-6">
          <Link
            href="/login"
            className="mb-5 inline-flex items-center gap-1.5 text-xs font700 uppercase tracking-[0.12em] text-brand-navy hover:underline dark:text-brand-sky"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Kembali ke masuk
          </Link>
          <h2 className="text-heading text-base-content">Lupa password</h2>
          <p className="mt-3 text-sm leading-6 text-base-content/70">
            Masukkan email yang terdaftar. Kami akan mengirimkan tautan untuk
            mereset password Anda.
          </p>
        </div>

        {sent ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand-green/30 bg-brand-green/5 px-5 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-brand-green" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font800 text-base-content">Email terkirim</p>
                <p className="text-sm text-base-content/70">
                  Jika email {email} terdaftar, tautan reset password akan
                  dikirim. Periksa kotak masuk (atau folder spam) Anda.
                </p>
              </div>
            </div>
            <Link href="/login">
              <Button variant="outline" className="w-full gap-2 text-[15px]">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Kembali ke halaman masuk
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2.5">
              <Label htmlFor="email">Email pengguna</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoFocus
                  placeholder="nama@perusahaan.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Mengirim tautan…
                </>
              ) : (
                "Kirim tautan reset"
              )}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
