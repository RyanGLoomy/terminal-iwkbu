import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerifikasiPOTable } from "@/components/verification/verifikasi-po-table";
import { VerifikasiArmadaTable } from "@/components/verification/verifikasi-armada-table";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Card, CardContent } from "@/components/ui/card";
import { StafIWStatsChartClient } from "@/components/dashboard/staf-iw-stats-chart-client";
import { FindingsAgingChart } from "@/components/dashboard/findings-aging-chart";
import { ActivityHeatmap } from "@/components/analytics/activity-heatmap";
import { FindingResolutionTrend } from "@/components/analytics/finding-resolution-trend";
import { SyncSuccessChart } from "@/components/analytics/sync-success-chart";
import { PoComplianceOverview } from "@/components/analytics/po-compliance-overview";
import Link from "next/link";
import {
   getAllPO,
   getAllArmada,
} from "@/lib/supabase/queries/verification.server";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { createClient } from "@/lib/supabase/server";

/** Compute date boundaries for analytics queries (pure wrapper) */
function getAnalyticsDates() {
   const nowMs = Date.now();
   return {
      todayStr: new Date(nowMs).toISOString().slice(0, 10),
      ninetyDaysAgoStr: new Date(nowMs - 90 * 86400000).toISOString().slice(0, 10),
      nowMs,
   };
}

export default async function StafIWDashboard() {
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   if (actor.role !== "staf-iw") redirect("/staf-iw");

   const supabase = await createClient();
   const { todayStr, ninetyDaysAgoStr, nowMs } = getAnalyticsDates();

   // Batch ALL queries in parallel — verification + analytics
   const [
      poMenunggu,
      poAktif,
      armadaMenunggu,
      armadaTerverifikasi,
      armadaDitolak,
      activityRes,
      findingsRes,
      syncRunsRes,
      syncStatusRes,
   ] = await Promise.all([
         getAllPO("menunggu"),
         getAllPO("aktif"),
         getAllArmada({ status_verifikasi: "menunggu" }),
         getAllArmada({ status_verifikasi: "terverifikasi" }),
         getAllArmada({ status_verifikasi: "ditolak" }),
         // Analytics: activity heatmap (90 days)
         supabase.rpc("get_activity_logs", {
            p_start_date: ninetyDaysAgoStr,
            p_end_date: todayStr,
            p_limit: 500,
            p_offset: 0,
         }),
         // Analytics: finding resolution trend
         supabase
            .from("findings")
            .select("created_at, resolved_at, status")
            .order("created_at", { ascending: true })
            .limit(500),
         // Analytics: sync runs
         supabase
            .from("iwkbu_sync_runs")
            .select("id, status, started_at, trigger_type")
            .order("started_at", { ascending: false })
            .limit(20),
         // Analytics: PO compliance
         supabase
            .from("iwkbu_sync_status")
            .select("po_id, reconciliation_status, po:po_id(kode_po, nama_perusahaan)"),
      ]);

   // ─── Transform analytics data ───

   // Activity → heatmap
   const activityLogs = (activityRes.data ?? []) as { created_at: string }[];
   const heatmapMap = new Map<string, number>();
   for (const log of activityLogs) {
      const d = new Date(log.created_at);
      const key = `${d.getDay()}-${d.getHours()}`;
      heatmapMap.set(key, (heatmapMap.get(key) ?? 0) + 1);
   }
   const heatmapData = Array.from(heatmapMap.entries()).map(([key, count]) => {
      const [day, hour] = key.split("-").map(Number);
      return { day_of_week: day, hour, count };
   });

   // Findings → resolution trend + aging
   const findings = (findingsRes.data ?? []) as {
      created_at: string; resolved_at: string | null; status: string;
   }[];
   const monthMap = new Map<string, { total: number; resolved: number; resolutionDays: number[] }>();
   const agingBuckets = { "0-7": 0, "8-30": 0, "30+": 0 };
   for (const f of findings) {
      const month = f.created_at.slice(0, 7);
      if (!monthMap.has(month)) monthMap.set(month, { total: 0, resolved: 0, resolutionDays: [] });
      const m = monthMap.get(month)!;
      m.total++;
      if (f.resolved_at) {
         m.resolved++;
         const days = Math.round((new Date(f.resolved_at).getTime() - new Date(f.created_at).getTime()) / 86400000);
         m.resolutionDays.push(days);
      }
      // Aging: only for unresolved findings
      if (f.status !== "resolved" && f.status !== "closed") {
         const age = Math.floor((nowMs - new Date(f.created_at).getTime()) / 86400000);
         if (age <= 7) agingBuckets["0-7"]++;
         else if (age <= 30) agingBuckets["8-30"]++;
         else agingBuckets["30+"]++;
      }
   }
   const trendData = Array.from(monthMap.entries()).slice(-6).map(([month, m]) => ({
      month: new Date(month + "-01").toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
      avg_resolution_days: m.resolutionDays.length > 0 ? Math.round(m.resolutionDays.reduce((a, b) => a + b, 0) / m.resolutionDays.length) : 0,
      total_findings: m.total,
      resolved_findings: m.resolved,
   }));
   const agingData = [
      { range: "0-7 hari", count: agingBuckets["0-7"], severity: "low" as const },
      { range: "8-30 hari", count: agingBuckets["8-30"], severity: "medium" as const },
      { range: "30+ hari", count: agingBuckets["30+"], severity: "high" as const },
   ];

   // Sync runs
   const syncRuns = (syncRunsRes.data ?? []) as {
      id: string; status: string; started_at: string; trigger_type: string;
   }[];

   // PO compliance
   const syncStatusRaw = (syncStatusRes.data ?? []) as unknown as {
      po_id: string; reconciliation_status: string;
      po: { kode_po: string; nama_perusahaan: string } | { kode_po: string; nama_perusahaan: string }[];
   }[];
   const poMap = new Map<string, { kode_po: string; nama_perusahaan: string; ready: number; needs_review: number; blocked: number; total: number }>();
   for (const s of syncStatusRaw) {
      const poData = Array.isArray(s.po) ? s.po[0] : s.po;
      if (!poMap.has(s.po_id)) {
         poMap.set(s.po_id, {
            kode_po: poData?.kode_po ?? "—",
            nama_perusahaan: poData?.nama_perusahaan ?? "—",
            ready: 0, needs_review: 0, blocked: 0, total: 0,
         });
      }
      const po = poMap.get(s.po_id)!;
      po.total++;
      if (s.reconciliation_status === "ready") po.ready++;
      else if (s.reconciliation_status === "needs_review") po.needs_review++;
      else if (s.reconciliation_status === "blocked") po.blocked++;
   }
   const poComplianceData = Array.from(poMap.values());

   return (
      <section className="space-y-6">
         {/* ─── Header ─── */}
         <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Pengawasan Integrasi Data
            </h1>
            <p className="text-sm text-base-content/70 mt-1 max-w-2xl">
               Pusat pengelolaan data sumber PO dan armada sebelum dipakai
               untuk rekonsiliasi, audit trail, dan tindak lanjut.
            </p>
         </div>

         {/* ─── Stat cards ─── */}
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
               title="PO Menunggu"
               value={String(poMenunggu.length)}
               description="Perlu verifikasi awal"
               icon="users"
               accent="amber"
               index={0}
            />
            <DashboardCard
               title="PO Aktif"
               value={String(poAktif.length)}
               description="Siap digunakan sebagai pembanding"
               icon="shield-check"
               accent="green"
               index={1}
            />
            <DashboardCard
               title="Armada Menunggu"
               value={String(armadaMenunggu.length)}
               description="Belum siap dipadankan"
               icon="bus"
               accent="amber"
               index={2}
            />
            <DashboardCard
               title="Armada Terverifikasi"
               value={String(armadaTerverifikasi.length)}
               description="Data siap untuk rekonsiliasi"
               icon="check-circle"
               accent="blue"
               index={3}
            />
         </div>

         {/* ─── Analytics: Tren & Aktivitas ─── */}
         <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-base-content/50 mb-3">
               Analitik &amp; Tren
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
               <FindingResolutionTrend data={trendData} />
               <SyncSuccessChart data={syncRuns} />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
               <div className="lg:col-span-2">
                  <ActivityHeatmap data={heatmapData} />
               </div>
               <FindingsAgingChart data={agingData} />
            </div>
            {poComplianceData.length > 0 && (
               <div className="mt-4">
                  <PoComplianceOverview data={poComplianceData} />
               </div>
            )}
         </div>

         {/* ─── Quick stats chart + workflow ─── */}
         <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
               <StafIWStatsChartClient
                  poMenunggu={poMenunggu.length}
                  poAktif={poAktif.length}
                  armadaMenunggu={armadaMenunggu.length}
                  armadaTerverifikasi={armadaTerverifikasi.length}
                  armadaDitolak={armadaDitolak.length}
               />
            </div>
            <Card className="border-base-300">
               <CardContent className="flex h-full flex-col justify-center gap-3 pt-5">
                  <div>
                     <p className="text-sm font-medium text-base-content">
                        Alur Kerja
                     </p>
                     <p className="text-sm text-base-content/70">
                        Verifikasi data sumber, lanjutkan ke rekonsiliasi.
                     </p>
                  </div>
                  <div className="flex flex-col gap-2">
                     <Link
                        href="/staf-iw/rekonsiliasi"
                        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                     >
                        Buka Rekonsiliasi
                     </Link>
                     <Link
                        href="/staf-iw/audit-trail"
                        className="inline-flex h-9 items-center justify-center rounded-md border border-base-300 bg-base-100 px-4 text-sm font-medium text-base-content transition-colors hover:bg-base-200/50"
                     >
                        Lihat Audit Trail
                     </Link>
                  </div>
               </CardContent>
            </Card>
         </div>

         {/* ─── Verification tabs ─── */}
         <Tabs defaultValue="po-menunggu" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 lg:w-[760px] h-auto p-1">
               <TabsTrigger
                  value="po-menunggu"
                   className="text-xs sm:text-sm py-2 flex-nowrap whitespace-nowrap"
               >
                  PO Menunggu
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-accent dark:bg-amber-950/50 dark:text-amber-300 text-[11px] font-semibold">
                     {poMenunggu.length}
                  </span>
               </TabsTrigger>
               <TabsTrigger
                  value="po-aktif"
                   className="text-xs sm:text-sm py-2 flex-nowrap whitespace-nowrap"
               >
                  PO Aktif
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-brand-green dark:bg-green-950/50 dark:text-green-300 text-[11px] font-semibold">
                     {poAktif.length}
                  </span>
               </TabsTrigger>
               <TabsTrigger
                  value="armada-menunggu"
                   className="text-xs sm:text-sm py-2 flex-nowrap whitespace-nowrap"
               >
                  Armada Menunggu
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-accent dark:bg-amber-950/50 dark:text-amber-300 text-[11px] font-semibold">
                     {armadaMenunggu.length}
                  </span>
               </TabsTrigger>
               <TabsTrigger
                  value="armada-terverifikasi"
                   className="text-xs sm:text-sm py-2 flex-nowrap whitespace-nowrap"
               >
                  Armada Terverifikasi
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-brand-green dark:bg-green-950/50 dark:text-green-300 text-[11px] font-semibold">
                     {armadaTerverifikasi.length}
                  </span>
               </TabsTrigger>
            </TabsList>

            <TabsContent value="po-menunggu" className="space-y-4">
               <VerifikasiPOTable data={poMenunggu} showActions />
            </TabsContent>

            <TabsContent value="po-aktif" className="space-y-4">
               <VerifikasiPOTable data={poAktif} showActions={false} />
            </TabsContent>

            <TabsContent value="armada-menunggu" className="space-y-4">
               <VerifikasiArmadaTable data={armadaMenunggu} showActions />
            </TabsContent>

            <TabsContent value="armada-terverifikasi" className="space-y-4">
               <VerifikasiArmadaTable
                  data={armadaTerverifikasi}
                  showActions={false}
               />
             </TabsContent>
          </Tabs>
       </section>
   );
}
