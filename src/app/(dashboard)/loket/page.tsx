import { redirect } from "next/navigation";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { PetugasDashboardPanel } from "@/components/operasional/petugas-dashboard-panel";
import {
   getPetugasDashboardStatsRPC,
   getActiveShiftSession,
} from "@/lib/supabase/queries/operasional.server";

export default async function LoketDashboardPage() {
   const actor = await getAuthenticatedActor();
   if (!actor) {
      redirect("/login");
   }

   const [initialStats, initialSession] = await Promise.all([
      getPetugasDashboardStatsRPC(),
      getActiveShiftSession(),
   ]);

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Dashboard Loket
            </h1>
            <p className="text-sm text-base-content/70 mt-1">
               Pantau pencatatan operasional harian.
            </p>
         </div>
         <PetugasDashboardPanel initialStats={initialStats} initialSession={initialSession} />
      </section>
   );
}
