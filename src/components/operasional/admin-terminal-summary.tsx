"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTerminalReport } from "@/lib/supabase/queries/operasional.client";
import { DatePicker } from "@/components/ui/date-picker";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Loader2 } from "lucide-react";

export function AdminTerminalSummary({
   terminalId,
   initialPetugasPinCount = 0,
   initialAkunLoketCount = 0,
}: {
   terminalId?: string | null;
   initialPetugasPinCount?: number;
   initialAkunLoketCount?: number;
}) {
   const [startDate, setStartDate] = useState(
      new Date().toISOString().slice(0, 10),
   );
   const [endDate, setEndDate] = useState(
      new Date().toISOString().slice(0, 10),
   );
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [totalMasuk, setTotalMasuk] = useState(0);
   const [totalKeluar, setTotalKeluar] = useState(0);
   const [petugasPinCount, setPetugasPinCount] = useState(
      initialPetugasPinCount,
   );
   const [akunLoketCount, setAkunLoketCount] = useState(
      initialAkunLoketCount,
   );

   useEffect(() => {
      let mounted = true;

      const load = async () => {
         setLoading(true);
         setError(null);

         try {
            if (!terminalId) {
               if (!mounted) return;
               setTotalMasuk(0);
               setTotalKeluar(0);
               setPetugasPinCount(initialPetugasPinCount);
               setAkunLoketCount(initialAkunLoketCount);
               return;
            }

            const report = await getTerminalReport({
               terminalId,
               startDate,
               endDate,
            });

            if (!mounted) return;

            setTotalMasuk(report.summary.total_masuk);
            setTotalKeluar(report.summary.total_keluar);
            setPetugasPinCount(initialPetugasPinCount);
            setAkunLoketCount(initialAkunLoketCount);

            // petugas PIN count is safe to refresh client-side; akun loket uses
            // the server-provided admin query because roles may be RLS-protected.
            const supabase = createClient();
            const { count: ptCount, error: ptError } = await supabase
               .from("petugas_terminal")
               .select("id", { count: "exact", head: true })
               .eq("terminal_id", terminalId)
               .eq("is_active", true);

            if (ptError) throw ptError;
            if (!mounted) return;

            setPetugasPinCount(ptCount ?? 0);
         } catch (err: unknown) {
            if (!mounted) return;
            setError(
               err instanceof Error ? err.message : "Gagal memuat ringkasan",
            );
         } finally {
            if (mounted) setLoading(false);
         }
      };

      load();

      return () => {
         mounted = false;
      };
   }, [
      startDate,
      endDate,
      terminalId,
      initialPetugasPinCount,
      initialAkunLoketCount,
   ]);

   const masihDiTerminal = totalMasuk - totalKeluar;

   return (
      <div className="space-y-5">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-[180px]">
                  <DatePicker value={startDate} onChange={setStartDate} />
               </div>
               <div className="w-[180px]">
                  <DatePicker value={endDate} onChange={setEndDate} />
               </div>
            </div>
         </div>

         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {loading ? (
               <div className="col-span-5 flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
               </div>
            ) : (
               <>
                  <DashboardCard
                     title="Kendaraan Masuk"
                     value={String(totalMasuk)}
                     icon="bus"
                     accent="blue"
                     index={0}
                  />
                  <DashboardCard
                     title="Kendaraan Keluar"
                     value={String(totalKeluar)}
                     icon="log-out"
                     accent="green"
                     index={1}
                  />
                  <DashboardCard
                     title="Masih di Terminal"
                     value={String(masihDiTerminal)}
                     icon="trending-up"
                     accent="amber"
                     index={2}
                  />
                  <DashboardCard
                     title="Petugas Aktif"
                     description="Petugas terdaftar PIN"
                     value={String(petugasPinCount)}
                     icon="user-check"
                     accent="violet"
                     index={3}
                  />
                  <DashboardCard
                     title="Akun Loket"
                     description="Device loket terdaftar"
                     value={String(akunLoketCount)}
                     icon="monitor"
                     accent="default"
                     index={4}
                  />
               </>
            )}
         </div>

         {error && <div className="text-sm text-destructive">{error}</div>}
      </div>
   );
}
