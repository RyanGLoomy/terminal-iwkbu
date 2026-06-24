import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PetugasDashboardPanel } from "@/components/operasional/petugas-dashboard-panel";

export default async function LoketDashboardPage() {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (!user) {
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
