"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatDateTime } from "@/lib/utils/format-date";
import {
   catatKendaraanKeluar,
   catatKendaraanMasuk,
   closeShiftSession,
   getActiveShiftSession,
   listActiveMasuk,
   listActivePOs,
   openShiftSession,
   searchArmadaByNopol,
} from "@/lib/supabase/queries/operasional.client";
import type {
   ActivePO,
   ActiveMasuk,
   ShiftSession,
} from "@/lib/supabase/queries/operasional.types";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { usePendingTransactions, type PendingTransaction } from "@/lib/hooks/use-pending-transactions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogIn, LogOut, Bus } from "lucide-react";
import { getErrorMessage } from "@/lib/db-error";

export function PencatatanPanel() {
   const [session, setSession] = useState<ShiftSession | null>(null);
   const [pos, setPos] = useState<ActivePO[]>([]);
   const [activeMasuk, setActiveMasuk] = useState<ActiveMasuk[]>([]);
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState<string | null>(null);

   const [nomorMasuk, setNomorMasuk] = useState("");
   const [selectedMasukId, setSelectedMasukId] = useState("");
   const [selectedPo, setSelectedPo] = useState("");
   const [detectedInfo, setDetectedInfo] = useState<{ po_nama: string; merk: string | null; tipe: string | null } | null>(null);
   const [detecting, setDetecting] = useState(false);
   const [pinWarning, setPinWarning] = useState<string | null>(null);
   const [recentNopol, setRecentNopol] = useState<string[]>([]);
   const { isOnline } = useOnlineStatus();
   const { pending, enqueue, replaying } = usePendingTransactions(async (tx: PendingTransaction) => {
      try {
         const endpoint = tx.type === "masuk" ? "/api/transaksi/masuk" : "/api/transaksi/keluar";
         const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tx.data),
         });
         return res.ok;
      } catch {
         return false;
      }
   });

   const canSubmitMasuk = session && nomorMasuk.trim() && selectedPo && isOnline;
   const canSubmitKeluar = session && selectedMasukId && isOnline;

   useEffect(() => {
      let mounted = true;

      const load = async () => {
         setLoading(true);
         try {
            const activeSession = await getActiveShiftSession();
            const [activePOs, masukAktif] = await Promise.all([
               listActivePOs(),
               activeSession ? listActiveMasuk(activeSession.id) : [],
            ]);

            if (!mounted) return;
            setSession(activeSession);
            setPos(activePOs);
            setActiveMasuk(masukAktif);
            setSelectedMasukId((current) => current || masukAktif[0]?.id || "");
            if (activePOs.length > 0) {
               setSelectedPo((current) => current || activePOs[0].id);
            }
         } catch (err: unknown) {
            if (!mounted) return;
            setError(getErrorMessage(err));
         } finally {
            if (mounted) setLoading(false);
         }
    };

    load();

     return () => {
        mounted = false;
     };
     }, []);

   // X2: PIN session expiry warning — check every 60s
   useEffect(() => {
      let active = true;
      async function checkPin() {
         try {
            const res = await fetch("/api/auth/pin-session");
            const data = await res.json();
            if (!active) return;
            if (data.verified && data.expires_at) {
               const remaining = new Date(data.expires_at).getTime() - Date.now();
               const minutes = Math.floor(remaining / 60000);
               if (minutes <= 0) {
                  setPinWarning("Sesi PIN telah kedaluwarsa. Silakan verifikasi ulang.");
               } else if (minutes <= 15) {
                  setPinWarning(`Sesi PIN akan habis dalam ${minutes} menit.`);
               } else {
                  setPinWarning(null);
               }
            }
         } catch { /* ignore — offline etc. */ }
      }
      checkPin();
      const interval = setInterval(checkPin, 60000);
      return () => { active = false; clearInterval(interval); };
   }, []);

   useEffect(() => {
      const q = nomorMasuk.trim();
      if (q.length < 3) {
         setDetectedInfo(null);
         setDetecting(false);
         return;
      }
      setDetecting(true);
      const timer = setTimeout(async () => {
         const result = await searchArmadaByNopol(q);
         if (result) {
            setSelectedPo(result.po_id);
            setDetectedInfo({ po_nama: result.po_nama, merk: result.merk, tipe: result.tipe });
         } else {
            setDetectedInfo(null);
         }
         setDetecting(false);
      }, 400);
      return () => clearTimeout(timer);
   }, [nomorMasuk]);

   const handleOpenSession = async () => {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      try {
         const opened = await openShiftSession();
         setSession(opened);
         const masukAktif = await listActiveMasuk(opened.id);
         setActiveMasuk(masukAktif);
         setSelectedMasukId(masukAktif[0]?.id || "");
         setSuccess("Sesi kerja berhasil dibuka.");
      } catch (err: unknown) {
         setError(getErrorMessage(err));
      } finally {
         setActionLoading(false);
      }
   };

   const handleCloseSession = async () => {
      if (!session) return;

      setActionLoading(true);
      setError(null);
      setSuccess(null);

      try {
         const result = await closeShiftSession(session.id);
         setSession(null);
         setActiveMasuk([]);
         setSelectedMasukId("");
         setSuccess(
            `Sesi kerja berhasil ditutup. Total masuk: ${result.total_transaksi_masuk}, keluar: ${result.total_transaksi_keluar}.`,
         );
      } catch (err: unknown) {
         setError(getErrorMessage(err));
      } finally {
         setActionLoading(false);
      }
   };

   const handleMasuk = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!session) {
         setError("Buka sesi kerja terlebih dahulu.");
         return;
      }

      setActionLoading(true);
      setError(null);
      setSuccess(null);

      try {
         await catatKendaraanMasuk({
            nomor_polisi: nomorMasuk,
            po_id: selectedPo,
            sesi_id: session.id,
         });
         setNomorMasuk("");
         setRecentNopol((prev) => {
            const next = [nomorMasuk, ...prev.filter((n) => n !== nomorMasuk)].slice(0, 5);
            return next;
         });
         const masukAktif = await listActiveMasuk(session.id);
         setActiveMasuk(masukAktif);
         setSelectedMasukId((current) => current || masukAktif[0]?.id || "");
         setSuccess("Kendaraan masuk berhasil dicatat.");
       } catch (err: unknown) {
          if (err instanceof TypeError && err.message.includes("fetch")) {
             enqueue({
                id: crypto.randomUUID(),
                type: "masuk",
                data: { nomor_polisi: nomorMasuk, po_id: selectedPo, sesi_id: session.id },
                timestamp: Date.now(),
             });
             setError("Koneksi terputus. Transaksi disimpan dan akan dikirim otomatis saat koneksi pulih.");
          } else {
             setError(getErrorMessage(err));
          }
       } finally {
          setActionLoading(false);
       }
    };

    const handleKeluar = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!session) {
         setError("Buka sesi kerja terlebih dahulu.");
         return;
      }

      setActionLoading(true);
      setError(null);
      setSuccess(null);

      try {
         await catatKendaraanKeluar({
            masuk_id: selectedMasukId,
            sesi_id: session.id,
         });
         const masukAktif = await listActiveMasuk(session.id);
         setActiveMasuk(masukAktif);
         setSelectedMasukId(masukAktif[0]?.id || "");
         setSuccess("Kendaraan keluar berhasil dicatat.");
       } catch (err: unknown) {
          if (err instanceof TypeError && err.message.includes("fetch")) {
             enqueue({
                id: crypto.randomUUID(),
                type: "keluar",
                data: { masuk_id: selectedMasukId, sesi_id: session.id },
                timestamp: Date.now(),
             });
             setError("Koneksi terputus. Transaksi disimpan dan akan dikirim otomatis saat koneksi pulih.");
          } else {
             setError(getErrorMessage(err));
          }
       } finally {
         setActionLoading(false);
      }
   };

   return (
      <div className="space-y-5">
         <Card className="card-interactive border-base-300">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
               <div>
                  <CardTitle className="text-base">
                     Sesi Kerja Petugas
                  </CardTitle>
                  <p className="text-sm text-base-content/70 mt-1">
                     Kelola sesi kerja sebelum melakukan pencatatan.
                  </p>
               </div>
               <Badge
                  className={`text-xs font-medium gap-1.5 ${session ? "bg-emerald-50 text-brand-green dark:bg-green-950/50 dark:text-green-300 dark:border-green-800" : "bg-base-200 text-base-content/70 border border-base-300"}`}
               >
                  <div
                     className={`status-dot ${session ? "bg-brand-green" : "bg-muted-foreground"}`}
                  />
                  {session ? "Aktif" : "Belum aktif"}
               </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
               <div className="text-sm text-base-content/70">
                  {session
                     ? `Mulai: ${formatDateTime(session.waktu_mulai)}`
                     : "Tidak ada sesi yang berjalan."}
               </div>
               <div className="flex gap-2">
                  <Button
                     onClick={handleOpenSession}
                     disabled={!!session || actionLoading}
                  >
                     {actionLoading && !session ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                     ) : (
                        <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                     )}
                     Buka Sesi
                  </Button>
                  <Button
                     variant="outline"
                     onClick={handleCloseSession}
                     disabled={!session || actionLoading}
                  >
                     {actionLoading && session ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     ) : (
                        <LogOut className="mr-2 h-4 w-4" />
                     )}
                     Tutup Sesi
                  </Button>
               </div>
            </CardContent>
          </Card>

          {!isOnline && (
             <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
               <AlertTitle>Koneksi Terputus</AlertTitle>
               <AlertDescription>
                  Anda sedang offline. Transaksi tidak dapat dicatat. Periksa koneksi internet Anda — transaksi akan tersedia kembali saat terhubung.
               </AlertDescription>
            </Alert>
          )}

          {(pending.length > 0 || replaying) && (
             <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
               <AlertTitle>
                  {replaying ? "Menyinkronkan transaksi..." : `${pending.length} transaksi pending`}
               </AlertTitle>
               <AlertDescription>
                  {replaying
                     ? "Mengirim transaksi yang tertunda..."
                     : "Transaksi akan dikirim otomatis saat koneksi pulih."}
               </AlertDescription>
            </Alert>
          )}

          {pinWarning && (
             <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
               <AlertTitle>Peringatan Sesi PIN</AlertTitle>
               <AlertDescription>{pinWarning}</AlertDescription>
            </Alert>
          )}

          {(error || success) && (
            <Alert
               variant={error ? "destructive" : "default"}
               className={`animate-fade-in ${!error ? "bg-brand-green/10 border-brand-green/25 text-brand-green" : ""}`}
            >
               <AlertTitle>
                  {error ? "Terjadi Kesalahan" : "Berhasil"}
               </AlertTitle>
               <AlertDescription>{error ?? success}</AlertDescription>
            </Alert>
         )}

         <div className="grid gap-5 lg:grid-cols-2">
            <Card className="card-interactive border-base-300">
               <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                     <LogIn className="h-4 w-4 text-primary" aria-hidden="true" />
                     Pencatatan Kendaraan Masuk
                  </CardTitle>
               </CardHeader>
               <CardContent>
                   <form onSubmit={handleMasuk} className="space-y-4">
                      {recentNopol.length > 0 && (
                         <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-base-content/50">Terbaru:</span>
                            {recentNopol.map((nopol) => (
                               <button
                                  key={nopol}
                                  type="button"
                                  className="rounded-full border border-base-300 bg-base-200/60 px-2.5 py-0.5 text-xs font-medium text-base-content/80 hover:bg-base-200 hover:text-base-content"
                                  onClick={() => setNomorMasuk(nopol)}
                               >
                                  {nopol}
                               </button>
                            ))}
                         </div>
                      )}
                      <div className="space-y-2">
                        <Label
                           htmlFor="nomor-polisi-masuk"
                           className="text-[13px]"
                        >
                           Nomor Kendaraan
                        </Label>
                        <Input
                           id="nomor-polisi-masuk"
                           placeholder="B 1234 XYZ"
                           value={nomorMasuk}
                           onChange={(event) =>
                              setNomorMasuk(event.target.value)
                           }
                           required
                           className="h-10 uppercase"
                        />
                        {detectedInfo && (
                           <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 dark:border-green-800 dark:bg-green-950/50 px-3 py-1.5 text-xs text-brand-green">
                              <Bus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span>
                                 {detectedInfo.merk} {detectedInfo.tipe} —{" "}
                                 <strong>{detectedInfo.po_nama}</strong>
                              </span>
                           </div>
                        )}
                        {detecting && (
                           <p className="text-xs text-base-content/70 flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                              Mencari kendaraan…
                           </p>
                        )}
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="po-select" className="text-[13px]">
                           PO
                        </Label>
                        <Select value={selectedPo} onValueChange={setSelectedPo}>
                           <SelectTrigger id="po-select">
                              <SelectValue placeholder="Pilih PO" />
                           </SelectTrigger>
                           <SelectContent>
                              {pos.length === 0 ? (
                                 <SelectItem value="none" disabled>
                                    PO aktif belum tersedia
                                 </SelectItem>
                              ) : (
                                 pos.map((po) => (
                                    <SelectItem key={po.id} value={po.id}>
                                       {po.kode_po} - {po.nama_perusahaan}
                                    </SelectItem>
                                 ))
                              )}
                           </SelectContent>
                        </Select>
                     </div>
                     <Button
                        type="submit"
                        disabled={!canSubmitMasuk || actionLoading}
                        className="w-full sm:w-auto"
                     >
                        {actionLoading && (
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        )}
                        Simpan Kendaraan Masuk
                     </Button>
                  </form>
               </CardContent>
            </Card>

            <Card className="card-interactive border-base-300">
               <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                     <LogOut className="h-4 w-4 text-violet-500" aria-hidden="true" />
                     Pencatatan Kendaraan Keluar
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  <form onSubmit={handleKeluar} className="space-y-4">
                     <div className="space-y-2">
                        <Label
                           htmlFor="nomor-polisi-keluar"
                           className="text-[13px]"
                        >
                           Nomor Kendaraan
                        </Label>
                        <Select
                           value={selectedMasukId}
                           onValueChange={setSelectedMasukId}
                           disabled={!session || activeMasuk.length === 0}
                        >
                           <SelectTrigger id="nomor-polisi-keluar">
                              <SelectValue placeholder="Pilih kendaraan" />
                           </SelectTrigger>
                           <SelectContent>
                              {activeMasuk.length === 0 ? (
                                 <SelectItem value="none" disabled>
                                    Tidak ada kendaraan aktif
                                 </SelectItem>
                              ) : (
                                 activeMasuk.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                       {item.nomor_polisi} -{" "}
                                       {item.po?.kode_po ?? "-"} (
                                       {formatDateTime(item.waktu_masuk)})
                                    </SelectItem>
                                 ))
                              )}
                           </SelectContent>
                        </Select>
                     </div>
                     <Button
                        type="submit"
                        disabled={!canSubmitKeluar || actionLoading}
                        className="w-full sm:w-auto"
                     >
                        {actionLoading && (
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        )}
                        Simpan Kendaraan Keluar
                     </Button>
                  </form>
               </CardContent>
            </Card>
         </div>

         {loading && (
            <div className="flex items-center gap-2 text-sm text-base-content/70 animate-fade-in">
               <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
               Memuat data…
            </div>
         )}
      </div>
   );
}
