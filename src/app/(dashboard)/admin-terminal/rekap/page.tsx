import { redirect } from "next/navigation";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { AdminRekapPanel } from "@/components/operasional/admin-rekap-panel";

export default async function AdminTerminalRekapPage() {
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   if (!actor.terminalId) {
      redirect("/error");
   }

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Rekap Data Operasional
            </h1>
            <p className="text-sm text-base-content/70 mt-1">
               Detail kendaraan masuk dan keluar seluruh petugas di terminal
               ini.
            </p>
         </div>
         <AdminRekapPanel terminalId={actor.terminalId} />
      </section>
   );
}
