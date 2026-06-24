import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { MasterDataPanel, type TerminalMasterRow } from "@/components/operasional/master-data-panel";
import type { JenisKendaraan, SystemSetting } from "@/lib/supabase/queries/operasional.types";

export default async function StafIwMasterDataPage() {
   const actor = await getAuthenticatedActor();

   if (!actor) redirect("/login");
   if (actor.role !== "staf-iw") redirect("/staf-iw");

   const adminClient = createAdminClient();
   const [terminalsRes, jenisRes, settingsRes] = await Promise.all([
      adminClient
         .from("terminals")
         .select("id, kode, nama")
         .order("nama", { ascending: true }),
      adminClient
         .from("jenis_kendaraan")
         .select("*")
         .order("urutan", { ascending: true }),
      adminClient
         .from("system_settings")
         .select("*")
         .order("category", { ascending: true })
         .order("key", { ascending: true }),
   ]);

   return (
      <section className="space-y-6">
         <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Master Data</h1>
            <p className="text-sm text-muted-foreground">
               Kelola data terminal, jenis kendaraan, dan pengaturan sistem.
            </p>
         </div>
         <MasterDataPanel
            initialTerminals={(terminalsRes.data ?? []) as TerminalMasterRow[]}
            initialJenisKendaraan={(jenisRes.data ?? []) as JenisKendaraan[]}
            initialSettings={(settingsRes.data ?? []) as SystemSetting[]}
            role="staf-iw"
         />
      </section>
   );
}
