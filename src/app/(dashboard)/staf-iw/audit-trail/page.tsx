import { redirect } from "next/navigation";
import { AuditTrailPanel } from "@/components/operasional/audit-trail-panel";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { ROLES } from "@/config/roles";

export default async function AuditTrailPage() {
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   if (actor.role !== ROLES.STAF_IW) redirect("/staf-iw");

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Audit Trail
            </h1>
            <p className="text-sm text-base-content/70 mt-1 max-w-2xl">
               Jejak aktivitas penting untuk monitoring, evaluasi, dan tindak
               lanjut pengawasan sistem.
            </p>
         </div>

         <AuditTrailPanel />
      </section>
   );
}
