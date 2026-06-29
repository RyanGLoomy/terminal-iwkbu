"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RouteError({
   error,
   reset,
}: {
   error: Error & { digest?: string };
   reset: () => void;
}) {
   return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 bg-base-100">
         <AlertCircle className="h-10 w-10 text-error" aria-hidden="true" />
         <div className="text-center">
            <h2 className="text-lg font-bold text-base-content">
               Terjadi Kesalahan
            </h2>
            <p className="mt-1 text-sm text-base-content/70">
               {error.message || "Gagal memuat halaman. Silakan coba lagi."}
            </p>
         </div>
         <Button onClick={reset} variant="outline">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Coba Lagi
         </Button>
      </div>
   );
}
