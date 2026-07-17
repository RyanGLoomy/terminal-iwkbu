import { redirect } from "next/navigation";
import { IwkbuSyncPanel } from "@/components/operasional/iwkbu-sync-panel";
import { getIwkbuSyncDashboard } from "@/lib/supabase/queries/iwkbu-sync.server";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { ROLES } from "@/config/roles";

export default async function IwkbuSyncPage() {
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   if (actor.role !== ROLES.STAF_IW) redirect("/staf-iw");

   const data = await getIwkbuSyncDashboard(200);

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Sinkronisasi IWKBU
            </h1>
            <p className="text-sm text-base-content/70 mt-1 max-w-2xl">
               Pantau status sinkronisasi data kepatuhan IWKBU, jalankan
               sinkronisasi manual, dan lihat hasil rekonsiliasi per armada.
            </p>
         </div>

         <IwkbuSyncPanel initialData={data} />
      </section>
   );
}
