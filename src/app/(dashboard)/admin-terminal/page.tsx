import { redirect } from "next/navigation";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import {
   getPetugasPinCount,
   getAkunLoketCount,
   getAdminRekapHarian,
} from "@/lib/supabase/queries/operasional.server";
import { AdminTerminalSummary } from "@/components/operasional/admin-terminal-summary";
import { WeeklyTrendChartClient } from "@/components/operasional/weekly-trend-chart-client";

export default async function AdminTerminalPage() {
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   const terminalId = actor.terminalId;

   const today = new Date().toISOString().slice(0, 10);

   // Paralelkan RPC yang independen (sebelumnya berurutan).
   const [petugasPinCount, akunLoketCount, todayRows] = terminalId
      ? await Promise.all([
           getPetugasPinCount(terminalId),
           getAkunLoketCount(terminalId),
           getAdminRekapHarian(terminalId, today),
        ])
      : [0, 0, []];

   const initialTotalMasuk = todayRows.length;
   const initialTotalKeluar = todayRows.filter(
      (r: { waktu_keluar: string | null }) => !!r.waktu_keluar,
   ).length;

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Dashboard Admin Terminal
            </h1>
            <p className="text-sm text-base-content/70 mt-1">
               Status operasional terminal hari ini.
            </p>
         </div>
         <AdminTerminalSummary
            terminalId={terminalId}
            initialPetugasPinCount={petugasPinCount}
            initialAkunLoketCount={akunLoketCount}
            initialTotalMasuk={initialTotalMasuk}
            initialTotalKeluar={initialTotalKeluar}
         />
         <WeeklyTrendChartClient />
      </section>
   );
}
