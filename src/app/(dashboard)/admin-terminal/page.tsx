import { redirect } from "next/navigation";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import {
   getPetugasPinCount,
   getAkunLoketCount,
} from "@/lib/supabase/queries/operasional.server";
import { AdminTerminalSummary } from "@/components/operasional/admin-terminal-summary";
import { WeeklyTrendChartClient } from "@/components/operasional/weekly-trend-chart-client";

export default async function AdminTerminalPage() {
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   const terminalId = actor.terminalId;

   // Paralelkan RPC yang independen (sebelumnya berurutan).
   const [petugasPinCount, akunLoketCount] = terminalId
      ? await Promise.all([
           getPetugasPinCount(terminalId),
           getAkunLoketCount(terminalId),
        ])
      : [0, 0];

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
               Dashboard Admin Terminal
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
               Status operasional terminal hari ini.
            </p>
         </div>
         <AdminTerminalSummary
            terminalId={terminalId}
            initialPetugasPinCount={petugasPinCount}
            initialAkunLoketCount={akunLoketCount}
         />
         <WeeklyTrendChartClient />
      </section>
   );
}
