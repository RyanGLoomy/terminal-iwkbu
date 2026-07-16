import { redirect } from "next/navigation";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityHeatmap } from "@/components/analytics/activity-heatmap";
import { FindingResolutionTrend } from "@/components/analytics/finding-resolution-trend";
import { SyncSuccessChart } from "@/components/analytics/sync-success-chart";
import { PoComplianceOverview } from "@/components/analytics/po-compliance-overview";

export default async function AnalyticsPage() {
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   if (actor.role !== "staf-iw") redirect("/staf-iw");

   const supabase = await createClient();

   // Parallel data fetch
   const [activityRes, findingsRes, syncRunsRes, syncStatusRes] = await Promise.all([
      // Activity heatmap: last 90 days
      supabase.rpc("get_activity_logs", {
         p_start_date: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),
         p_end_date: new Date().toISOString().slice(0, 10),
         p_limit: 500,
         p_offset: 0,
      }),

      // Finding resolution: created + resolved per month
      supabase
         .from("findings")
         .select("created_at, resolved_at, status")
         .order("created_at", { ascending: true })
         .limit(500),

      // Sync runs: last 20
      supabase
         .from("iwkbu_sync_runs")
         .select("id, status, started_at, trigger_type")
         .order("started_at", { ascending: false })
         .limit(20),

      // PO compliance overview
      supabase
         .from("iwkbu_sync_status")
         .select("po_id, reconciliation_status, po:po_id(kode_po, nama_perusahaan)"),
   ]);

   // Transform activity logs → heatmap data
   const activityLogs = (activityRes.data ?? []) as { created_at: string }[];
   const heatmapData: { day_of_week: number; hour: number; count: number }[] = [];
   const heatmapMap = new Map<string, number>();
   for (const log of activityLogs) {
      const d = new Date(log.created_at);
      const day = d.getDay();
      const hour = d.getHours();
      const key = `${day}-${hour}`;
      heatmapMap.set(key, (heatmapMap.get(key) ?? 0) + 1);
   }
   for (const [key, count] of heatmapMap) {
      const [day, hour] = key.split("-").map(Number);
      heatmapData.push({ day_of_week: day, hour, count });
   }

   // Transform findings → resolution trend per month
   const findings = (findingsRes.data ?? []) as { created_at: string; resolved_at: string | null; status: string }[];
   const monthMap = new Map<string, { total: number; resolved: number; resolutionDays: number[] }>();
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
   }
   const trendData = Array.from(monthMap.entries()).slice(-6).map(([month, m]) => ({
      month: new Date(month + "-01").toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
      avg_resolution_days: m.resolutionDays.length > 0 ? Math.round(m.resolutionDays.reduce((a, b) => a + b, 0) / m.resolutionDays.length) : 0,
      total_findings: m.total,
      resolved_findings: m.resolved,
   }));

   // Transform sync runs
   const syncRuns = (syncRunsRes.data ?? []) as { id: string; status: string; started_at: string; trigger_type: string }[];

   // Transform PO compliance
   const syncStatusRaw = (syncStatusRes.data ?? []) as unknown as { po_id: string; reconciliation_status: string; po: { kode_po: string; nama_perusahaan: string } | { kode_po: string; nama_perusahaan: string }[] }[];
   const poMap = new Map<string, { kode_po: string; nama_perusahaan: string; ready: number; needs_review: number; blocked: number; total: number }>();
   for (const s of syncStatusRaw) {
      const key = s.po_id;
      const poData = Array.isArray(s.po) ? s.po[0] : s.po;
      if (!poMap.has(key)) {
         poMap.set(key, {
            kode_po: poData?.kode_po ?? "—",
            nama_perusahaan: poData?.nama_perusahaan ?? "—",
            ready: 0, needs_review: 0, blocked: 0, total: 0,
         });
      }
      const po = poMap.get(key)!;
      po.total++;
      if (s.reconciliation_status === "ready") po.ready++;
      else if (s.reconciliation_status === "needs_review") po.needs_review++;
      else if (s.reconciliation_status === "blocked") po.blocked++;
   }
   const poComplianceData = Array.from(poMap.values());

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Analitik & Tren
            </h1>
            <p className="text-sm text-base-content/60 mt-1">
               Visualisasi aktivitas, resolusi temuan, dan compliance IWKBU
            </p>
         </div>

         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="pb-4 pt-4">
               <p className="text-xs font-semibold uppercase tracking-wider text-base-content/60">Total Aktivitas (90 hari)</p>
               <p className="text-2xl font-extrabold text-base-content mt-1">{activityLogs.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pb-4 pt-4">
               <p className="text-xs font-semibold uppercase tracking-wider text-base-content/60">Total Temuan</p>
               <p className="text-2xl font-extrabold text-base-content mt-1">{findings.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pb-4 pt-4">
               <p className="text-xs font-semibold uppercase tracking-wider text-base-content/60">Sync Runs</p>
               <p className="text-2xl font-extrabold text-base-content mt-1">{syncRuns.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pb-4 pt-4">
               <p className="text-xs font-semibold uppercase tracking-wider text-base-content/60">PO Aktif</p>
               <p className="text-2xl font-extrabold text-base-content mt-1">{poComplianceData.length}</p>
            </CardContent></Card>
         </div>

         <ActivityHeatmap data={heatmapData} />

         <div className="grid gap-4 lg:grid-cols-2">
            <FindingResolutionTrend data={trendData} />
            <SyncSuccessChart data={syncRuns} />
         </div>

         <PoComplianceOverview data={poComplianceData} />
      </section>
   );
}
