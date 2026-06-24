import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
   getAdminTerminalStats,
   getPetugasPinCount,
   getAkunLoketCount,
} from "@/lib/supabase/queries/operasional.server";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { AdminTerminalSummary } from "@/components/operasional/admin-terminal-summary";
const WeeklyTrendChart = dynamic(
   () =>
      import("@/components/operasional/weekly-trend-chart").then(
         (m) => m.WeeklyTrendChart,
      ),
   {
      loading: () => <div className="h-[300px] rounded-xl bg-muted/30 animate-pulse" />,
   },
);

export default async function AdminTerminalPage() {
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

   const terminalId = profile?.terminal_id;

   const stats = terminalId ? await getAdminTerminalStats(terminalId) : null;
   const petugasPinCount = terminalId
      ? await getPetugasPinCount(terminalId)
      : 0;
   const akunLoketCount = terminalId ? await getAkunLoketCount(terminalId) : 0;

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
               Dashboard Admin Terminal
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
               Status operasional terminal hari ini.
            </p>
         </div>
         <AdminTerminalSummary
            terminalId={terminalId}
            initialPetugasPinCount={petugasPinCount}
            initialAkunLoketCount={akunLoketCount}
         />
         <WeeklyTrendChart />
      </section>
   );
}
