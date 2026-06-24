"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
          <div className="text-center max-w-md">
            <h1 className="text-7xl font-bold tracking-tight text-foreground">
              Error
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Terjadi kesalahan yang tidak terduga.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Silakan coba lagi atau hubungi administrator.
            </p>
            <button
              onClick={reset}
              className="mt-8 inline-flex items-center justify-center rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
