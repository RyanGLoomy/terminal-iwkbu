"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PoError({
   error,
   reset,
}: {
   error: Error & { digest?: string };
   reset: () => void;
}) {
   return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
         <AlertCircle className="h-10 w-10 text-destructive" />
         <div className="text-center">
            <h2 className="text-lg font-bold text-foreground">
               Terjadi Kesalahan
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
               {error.message || "Gagal memuat halaman. Silakan coba lagi."}
            </p>
         </div>
         <Button onClick={reset} variant="outline">
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
         </Button>
      </div>
   );
}
