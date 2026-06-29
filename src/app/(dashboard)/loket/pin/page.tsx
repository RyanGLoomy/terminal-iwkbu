"use client";

import { useEffect, useState } from "react";
import {
   getPinSession,
   upsertPinSession,
   verifyPetugasPin,
} from "@/lib/supabase/queries/operasional.client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldCheck } from "lucide-react";
import { getErrorMessage } from "@/lib/db-error";

export default function LoketPinPage() {
   const [pin, setPin] = useState("");
   const [loading, setLoading] = useState(false);
   const [checking, setChecking] = useState(true);
   const [error, setError] = useState<string | null>(null);

   // Check for existing valid PIN session — if found, go straight to dashboard
   useEffect(() => {
      let mounted = true;

      const load = async () => {
         try {
            const pinSession = await getPinSession();
            if (!mounted) return;

            if (pinSession) {
               // PIN already valid, redirect to dashboard
               window.location.href = "/loket";
               return;
            }
         } catch {
            // Ignore — user just needs to enter PIN
         } finally {
            if (mounted) setChecking(false);
         }
      };

      load();
      return () => {
         mounted = false;
      };
   }, []);

   const handleVerifyPin = async () => {
      setLoading(true);
      setError(null);

      try {
         if (!/^\d{4,6}$/.test(pin)) {
            throw new Error("PIN harus 4-6 digit angka");
         }

         const result = await verifyPetugasPin(pin);
         if (!result.verified) {
            throw new Error("PIN tidak valid");
         }

         await upsertPinSession(
            result.petugas_id && result.petugas_nama
               ? {
                    petugas_terminal_id: result.petugas_id,
                    petugas_nama: result.petugas_nama,
                 }
               : undefined,
         );

         // Langsung ke dashboard setelah PIN terverifikasi
         window.location.href = "/loket";
      } catch (err: unknown) {
         setError(getErrorMessage(err));
      } finally {
         setLoading(false);
      }
   };

   if (checking) {
      return (
         <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center animate-fade-in">
            <div className="flex items-center gap-2 text-sm text-base-content/70">
               <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
               Memeriksa sesi…
            </div>
         </div>
      );
   }

   return (
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center animate-fade-in">
         <Card className="w-full max-w-md border-base-300 shadow-lg ">
            <CardHeader className="pb-4 text-center">
               <div className="mx-auto w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
                  <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
               </div>
               <CardTitle className="text-lg">Quick Login PIN</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {error && (
                  <Alert variant="destructive" className="animate-fade-in">
                     <AlertTitle>Terjadi Kesalahan</AlertTitle>
                     <AlertDescription>{error}</AlertDescription>
                  </Alert>
               )}

                <form
                   className="space-y-4"
                   onSubmit={(e) => {
                      e.preventDefault();
                      handleVerifyPin();
                   }}
                >
                   <div className="space-y-2">
                      <Label htmlFor="pin" className="text-[13px]">
                         PIN Petugas (4-6 digit)
                      </Label>
                      <Input
                         id="pin"
                         type="password"
                         inputMode="numeric"
                         autoFocus
                         maxLength={6}
                         value={pin}
                         onChange={(event) =>
                            setPin(event.target.value.replace(/\D/g, ""))
                         }
                         placeholder="••••"
                         className="h-11 text-center text-lg tracking-[0.3em]"
                      />
                   </div>
                   <Button
                      type="submit"
                      className="w-full h-11"
                      disabled={loading}
                   >
                      {loading ? (
                         <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                            Memverifikasi…
                         </>
                      ) : (
                         "Verifikasi PIN"
                      )}
                   </Button>
                </form>
            </CardContent>
         </Card>
      </div>
   );
}
