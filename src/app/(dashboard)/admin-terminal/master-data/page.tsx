import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { MasterDataPanel, type TerminalMasterRow } from "@/components/operasional/master-data-panel";
import type { JenisKendaraan } from "@/lib/supabase/queries/operasional.types";

export default async function AdminTerminalMasterDataPage() {
   const actor = await getAuthenticatedActor();

   if (!actor) redirect("/login");
   if (actor.role !== "admin-terminal") redirect("/admin-terminal");
   if (!actor.terminalId) redirect("/error");

   const adminClient = createAdminClient();
   const [terminalsRes, jenisRes] = await Promise.all([
      adminClient
         .from("terminals")
         .select("id, kode, nama")
         .eq("id", actor.terminalId)
         .order("nama", { ascending: true }),
      adminClient
         .from("jenis_kendaraan")
         .select("*")
         .order("urutan", { ascending: true }),
   ]);

   return (
      <section className="space-y-6">
         <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-base-content">Master Data</h1>
            <p className="text-sm text-base-content/70">
               Kelola data dasar terminal untuk operasional IWKBU.
            </p>
         </div>
         <MasterDataPanel
            initialTerminals={(terminalsRes.data ?? []) as TerminalMasterRow[]}
            initialJenisKendaraan={(jenisRes.data ?? []) as JenisKendaraan[]}
            role="admin-terminal"
         />
      </section>
   );
}
