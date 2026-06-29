import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-100/40 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/40">
          <AlertTriangle className="h-7 w-7 text-error" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-base-content">
            Terjadi Kesalahan
          </h1>
          <p className="text-sm text-base-content/70">
            Coba muat ulang halaman atau kembali lagi nanti.
          </p>
        </div>
        <Link href="/login">
          <Button>Kembali ke Login</Button>
        </Link>
      </div>
    </div>
  );
}
