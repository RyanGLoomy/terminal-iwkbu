import { redirect } from "next/navigation";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { PetugasDashboardPanel } from "@/components/operasional/petugas-dashboard-panel";

export default async function LoketDashboardPage() {
   const actor = await getAuthenticatedActor();
   if (!actor) {
      redirect("/login");
   }

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
               Dashboard Loket
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
               Pantau pencatatan operasional harian.
            </p>
         </div>
         <PetugasDashboardPanel />
      </section>
   );
}
