import { RegistrasiPOForm } from "@/components/verification/registrasi-po-form";
import { ArrowLeft, Building2, Bus, CheckCircle2, FileCheck2 } from "lucide-react";
import Link from "next/link";

const requirements = [
  "Gunakan email aktif perusahaan",
  "Kode PO minimal 3 karakter",
  "Akun baru menunggu verifikasi Staf IW",
];

export default function RegistrasiPOPage() {
  return (
    <main className="relative z-10 min-h-screen px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <section className="command-panel rounded-3xl p-5 sm:p-8 lg:sticky lg:top-8">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font700 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke login
          </Link>

          <div className="mt-6 space-y-5 sm:mt-10 sm:space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-brand-sky shadow-elevation-3 sm:h-16 sm:w-16 sm:rounded-3xl">
              <Bus className="h-6 w-6 text-white sm:h-8 sm:w-8" />
            </div>
            <div>
              <p className="mb-3 text-xs font800 uppercase tracking-[0.14em] text-brand-sky">
                Registrasi Perusahaan Otobus
              </p>
              <h1 className="text-heading max-w-xl text-foreground">
                Daftarkan akun PO untuk akses operasional IWKBU.
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:mt-4">
                Setelah data dikirim, Staf IW akan memverifikasi akun sebelum perusahaan dapat mengelola armada dan temuan.
              </p>
            </div>

            <div className="rounded-2xl border border-brand-green/25 bg-brand-green/10 px-4 py-3 text-sm font700 text-foreground sm:hidden">
              Akun baru akan menunggu verifikasi Staf IW.
            </div>

            <div className="hidden gap-3 sm:grid">
              {requirements.map((requirement) => (
                <div key={requirement} className="flex items-start gap-3 rounded-2xl border border-border/80 bg-card/70 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                  <span className="text-sm text-muted-foreground">{requirement}</span>
                </div>
              ))}
            </div>

            <div className="hidden grid-cols-2 gap-3 pt-2 sm:grid">
              <div className="rounded-2xl border border-brand-sky/20 bg-secondary p-4">
                <Building2 className="mb-4 h-5 w-5 text-brand-sky" />
                <p className="text-xs font800 uppercase tracking-[0.1em] text-muted-foreground">Data</p>
                <p className="mt-1 text-sm font800 text-foreground">Perusahaan</p>
              </div>
              <div className="rounded-2xl border border-brand-green/25 bg-brand-green/10 p-4">
                <FileCheck2 className="mb-4 h-5 w-5 text-brand-green" />
                <p className="text-xs font800 uppercase tracking-[0.1em] text-muted-foreground">Status</p>
                <p className="mt-1 text-sm font800 text-foreground">Diverifikasi</p>
              </div>
            </div>
          </div>
        </section>

        <RegistrasiPOForm />
      </div>
    </main>
  );
}
