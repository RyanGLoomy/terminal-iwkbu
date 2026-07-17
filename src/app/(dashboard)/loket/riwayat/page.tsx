import { redirect } from "next/navigation";
import { RekapHarianPanel } from "@/components/operasional/rekap-harian-panel";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { ROLES } from "@/config/roles";

export default async function LoketRiwayatPage() {
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   if (actor.role !== ROLES.PETUGAS_LOKET) redirect("/loket");

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Rekap Harian
            </h1>
            <p className="text-sm text-base-content/70 mt-1">
               Rekap sederhana kendaraan masuk dan keluar per hari.
            </p>
         </div>
         <RekapHarianPanel />
      </section>
   );
}
