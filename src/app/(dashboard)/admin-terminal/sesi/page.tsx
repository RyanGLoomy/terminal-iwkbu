import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RekapSesiPanel } from "@/components/operasional/rekap-sesi-panel";

export default async function AdminTerminalSesiPage() {
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
               Rekap Sesi Kerja
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
               Daftar sesi kerja petugas, filter berdasarkan tanggal, dan lihat
               detail transaksi per sesi.
            </p>
         </div>
         <RekapSesiPanel terminalId={profile.terminal_id} />
      </section>
   );
}
