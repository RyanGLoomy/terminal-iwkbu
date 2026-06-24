import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminRekapPanel } from "@/components/operasional/admin-rekap-panel";

export default async function AdminTerminalRekapPage() {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (!user) redirect("/login");

   const { data: profile } = await supabase
      .from("profiles")
      .select("terminal_id")
      .eq("id", user.id)
      .single();

   if (!profile?.terminal_id) {
      redirect("/error");
   }

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
               Rekap Data Operasional
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
               Detail kendaraan masuk dan keluar seluruh petugas di terminal
               ini.
            </p>
         </div>
         <AdminRekapPanel terminalId={profile.terminal_id} />
      </section>
   );
}
