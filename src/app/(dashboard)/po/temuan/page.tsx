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
            <div className="text-center py-14 text-muted-foreground bg-muted/50 rounded-xl border border-dashed border-border">
               <p className="text-sm">Profil PO tidak ditemukan.</p>
            </div>
         </section>
      );
   }

   const findings = await getPoFindings(user.id);

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
               Temuan & Klarifikasi
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
               Lihat temuan yang berkaitan dengan armada Anda dan berikan
               klarifikasi jika diperlukan.
            </p>
         </div>

         <PoFindingsPanel findings={findings} />
      </section>
   );
}
