"use client";

import { useEffect, useId, useState } from "react";
import {
   AreaChart,
   Area,
   BarChart,
   Bar,
   XAxis,
   YAxis,
   CartesianGrid,
   Tooltip,
   ResponsiveContainer,
   Legend,
} from "recharts";
import { getWeeklyTrend } from "@/lib/supabase/queries/operasional.client";
import type { DailyTrendRow } from "@/lib/supabase/queries/operasional.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/loading-state";
import { BarChart3, TrendingUp } from "lucide-react";

export function WeeklyTrendChart({
   petugasId,
}: {
   petugasId?: string;
}) {
   const chartId = useId().replace(/:/g, "");
   const masukGradientId = `weekly-trend-masuk-${chartId}`;
   const keluarGradientId = `weekly-trend-keluar-${chartId}`;
   const [data, setData] = useState<DailyTrendRow[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      let mounted = true;

      const load = async () => {
         try {
            const trend = await getWeeklyTrend(petugasId);
            if (mounted) setData(trend);
         } catch {
            // silently fail — chart is supplementary
         } finally {
            if (mounted) setLoading(false);
         }
      };

      load();
      return () => {
         mounted = false;
      };
   }, [petugasId]);

    if (loading) {
       return (
          <Card className="border-border">
             <CardContent>
                <LoadingState variant="spinner" text="Memuat grafik..." />
             </CardContent>
          </Card>
       );
    }

   const hasData = data.some((d) => d.total > 0);

   return (
      <div className="grid gap-5 lg:grid-cols-2">
         {/* Area Chart — Tren Masuk/Keluar */}
         <Card className="border-border">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <TrendingUp className="h-4 w-4 text-brand-sky" />
                  Tren Kendaraan (7 Hari)
               </CardTitle>
            </CardHeader>
            <CardContent>
               {!hasData ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                     Belum ada data transaksi minggu ini.
                  </div>
               ) : (
                  <ResponsiveContainer width="100%" height={260}>
                     <AreaChart
                        data={data}
                        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                     >
                         <defs>
                            <linearGradient
                               id={masukGradientId}
                               x1="0"
                               y1="0"
                               x2="0"
                               y2="1"
                            >
                              <stop
                                 offset="5%"
                                 stopColor="var(--color-brand-sky)"
                                 stopOpacity={0.3}
                              />
                              <stop
                                 offset="95%"
                                 stopColor="var(--color-brand-sky)"
                                 stopOpacity={0}
                              />
                           </linearGradient>
                            <linearGradient
                               id={keluarGradientId}
                               x1="0"
                               y1="0"
                               x2="0"
                               y2="1"
                            >
                              <stop
                                 offset="5%"
                                 stopColor="var(--color-brand-green)"
                                 stopOpacity={0.3}
                              />
                              <stop
                                 offset="95%"
                                 stopColor="var(--color-brand-green)"
                                 stopOpacity={0}
                              />
                           </linearGradient>
                        </defs>
                        <CartesianGrid
                           strokeDasharray="3 3"
                           stroke="#e2e8f0"
                           vertical={false}
                        />
                        <XAxis
                           dataKey="label"
                           axisLine={false}
                           tickLine={false}
                           tick={{ fontSize: 12, fill: "#94a3b8" }}
                        />
                        <YAxis
                           axisLine={false}
                           tickLine={false}
                           tick={{ fontSize: 12, fill: "#94a3b8" }}
                           allowDecimals={false}
                        />
                        <Tooltip
                           contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                              fontSize: "13px",
                           }}
                           // eslint-disable-next-line @typescript-eslint/no-explicit-any
                           formatter={(value: any, name: any) => [
                              value ?? 0,
                              name === "masuk" ? "Masuk" : "Keluar",
                           ]}
                           labelFormatter={(label) => `Hari: ${label}`}
                        />
                        <Legend
                           formatter={(value) =>
                              value === "masuk" ? "Masuk" : "Keluar"
                           }
                           iconType="circle"
                           wrapperStyle={{ fontSize: "12px" }}
                        />
                        <Area
                           type="monotone"
                           dataKey="masuk"
                           stroke="var(--color-brand-sky)"
                           strokeWidth={2}
                            fill={`url(#${masukGradientId})`}
                        />
                        <Area
                           type="monotone"
                           dataKey="keluar"
                           stroke="var(--color-brand-green)"
                           strokeWidth={2}
                            fill={`url(#${keluarGradientId})`}
                        />
                     </AreaChart>
                  </ResponsiveContainer>
               )}
            </CardContent>
         </Card>

         {/* Bar Chart — Total per Hari */}
         <Card className="border-border">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <BarChart3 className="h-4 w-4 text-brand-green" />
                  Total Transaksi Harian
               </CardTitle>
            </CardHeader>
            <CardContent>
               {!hasData ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                     Belum ada data transaksi minggu ini.
                  </div>
               ) : (
                  <ResponsiveContainer width="100%" height={260}>
                     <BarChart
                        data={data}
                        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                     >
                        <CartesianGrid
                           strokeDasharray="3 3"
                           stroke="#e2e8f0"
                           vertical={false}
                        />
                        <XAxis
                           dataKey="label"
                           axisLine={false}
                           tickLine={false}
                           tick={{ fontSize: 12, fill: "#94a3b8" }}
                        />
                        <YAxis
                           axisLine={false}
                           tickLine={false}
                           tick={{ fontSize: 12, fill: "#94a3b8" }}
                           allowDecimals={false}
                        />
                        <Tooltip
                           contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                              fontSize: "13px",
                           }}
                           // eslint-disable-next-line @typescript-eslint/no-explicit-any
                           formatter={(value: any, name: any) => [
                              value ?? 0,
                              name === "masuk" ? "Masuk" : "Keluar",
                           ]}
                           labelFormatter={(label) => `Hari: ${label}`}
                        />
                        <Legend
                           formatter={(value) =>
                              value === "masuk" ? "Masuk" : "Keluar"
                           }
                           iconType="circle"
                           wrapperStyle={{ fontSize: "12px" }}
                        />
                        <Bar
                           dataKey="masuk"
                           fill="var(--color-brand-sky)"
                           radius={[4, 4, 0, 0]}
                           barSize={20}
                        />
                        <Bar
                           dataKey="keluar"
                           fill="var(--color-brand-green)"
                           radius={[4, 4, 0, 0]}
                           barSize={20}
                        />
                     </BarChart>
                  </ResponsiveContainer>
               )}
            </CardContent>
         </Card>
      </div>
   );
}
