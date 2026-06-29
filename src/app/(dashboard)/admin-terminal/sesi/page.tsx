import { redirect } from "next/navigation";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { RekapSesiPanel } from "@/components/operasional/rekap-sesi-panel";

export default async function AdminTerminalSesiPage() {
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   if (!actor.terminalId) {
      redirect("/error");
   }

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Rekap Sesi Kerja
            </h1>
            <p className="text-sm text-base-content/70 mt-1">
               Daftar sesi kerja petugas, filter berdasarkan tanggal, dan lihat
               detail transaksi per sesi.
            </p>
         </div>
         <RekapSesiPanel terminalId={actor.terminalId} />
      </section>
   );
}
