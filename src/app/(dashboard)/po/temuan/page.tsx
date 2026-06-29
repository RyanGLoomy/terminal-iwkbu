import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { PoFindingsPanel } from "@/components/operasional/po-findings-panel";
import { getPoFindings } from "@/lib/supabase/queries/findings.server";

export default async function POTemuanPage() {
   const supabase = await createClient();
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   const user = actor.user;

   const { data: poData } = await supabase
      .from("po")
      .select("status_verifikasi")
      .eq("id", user.id)
      .single();

   if (!poData) {
      return (
         <section className="space-y-6">
            <div className="text-center py-14 text-base-content/70 bg-base-200/50 rounded-xl border border-dashed border-base-300">
               <p className="text-sm">Profil PO tidak ditemukan.</p>
            </div>
         </section>
      );
   }

   const findings = await getPoFindings(user.id);

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Temuan & Klarifikasi
            </h1>
            <p className="text-sm text-base-content/70 mt-1 max-w-2xl">
               Lihat temuan yang berkaitan dengan armada Anda dan berikan
               klarifikasi jika diperlukan.
            </p>
         </div>

         <PoFindingsPanel findings={findings} />
      </section>
   );
}
