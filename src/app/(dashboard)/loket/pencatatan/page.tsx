import { redirect } from "next/navigation";
import { PencatatanPanel } from "@/components/operasional/pencatatan-panel";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { ROLES } from "@/config/roles";

export default async function LoketPencatatanPage() {
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   if (actor.role !== ROLES.PETUGAS_LOKET) redirect("/loket");

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Pencatatan Operasional
            </h1>
            <p className="text-sm text-base-content/70 mt-1">
               Catat kendaraan masuk dan keluar selama sesi kerja.
            </p>
         </div>
         <PencatatanPanel />
      </section>
   );
}
