import { redirect } from "next/navigation";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { AdminLaporanPanel } from "@/components/operasional/admin-laporan-panel";

export default async function AdminTerminalLaporanPage() {
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   if (!actor.terminalId) {
      redirect("/error");
   }

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
               Laporan Terminal
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
               Rekapitulasi data kendaraan per PO untuk pelaporan.
            </p>
         </div>
         <AdminLaporanPanel terminalId={actor.terminalId} />
      </section>
   );
}
