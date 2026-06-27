import { redirect } from "next/navigation";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { ManagementAkunPanel } from "@/components/operasional/management-akun-panel";

export default async function AdminTerminalPetugasPage() {
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   if (!actor.terminalId) {
      redirect("/error");
   }

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
               Manajemen Akun
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
               Kelola akun petugas dan PIN untuk terminal Anda.
            </p>
         </div>
         <ManagementAkunPanel terminalId={actor.terminalId} />
      </section>
   );
}
