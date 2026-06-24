import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <h1 className="text-7xl font-bold tracking-tight text-foreground">
          404
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Halaman tidak ditemukan.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman yang Anda cari mungkin telah dipindahkan atau tidak tersedia.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
        >
          Kembali ke Halaman Login
        </Link>
      </div>
    </div>
  );
}
