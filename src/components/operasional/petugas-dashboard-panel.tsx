"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import {
   closeShiftSession,
   getActiveShiftSession,
   getPetugasDashboardStatsRPC,
   openShiftSession,
} from "@/lib/supabase/queries/operasional.client";
import type {
   PetugasDashboardRPC,
   ShiftSession,
} from "@/lib/supabase/queries/operasional.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { LoadingState } from "@/components/shared/loading-state";
import { Activity, LogIn, LogOut, Loader2, TrendingUp } from "lucide-react";

const WeeklyTrendChart = dynamic(
   () =>
      import("@/components/operasional/weekly-trend-chart").then(
         (m) => m.WeeklyTrendChart,
      ),
   {
      ssr: false,
      loading: () => <div className="h-[300px] rounded-xl bg-muted/30 animate-pulse" />,
   },
);

function formatDateTime(value: string) {
   return new Date(value).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
   });
}

export function PetugasDashboardPanel() {
   const [stats, setStats] = useState<PetugasDashboardRPC | null>(null);
   const [session, setSession] = useState<ShiftSession | null>(null);
   const [userId, setUserId] = useState<string | null>(null);
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState<string | null>(null);

   const loadData = async () => {
      setLoading(true);
      try {
         const supabase = createClient();
         const {
            data: { user },
         } = await supabase.auth.getUser();
         if (user) setUserId(user.id);
         const [statsData, activeSession] = await Promise.all([
            getPetugasDashboardStatsRPC(),
            getActiveShiftSession(),
         ]);
         setStats(statsData);
         setSession(activeSession);
      } catch (err: unknown) {
         const message =
            err instanceof Error ? err.message : "Gagal memuat data";
         setError(message);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      loadData();
   }, []);

   const handleOpenSession = async () => {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      try {
         const opened = await openShiftSession();
         setSession(opened);
         setSuccess("Sesi kerja berhasil dibuka.");
         await loadData();
      } catch (err: unknown) {
         const message =
            err instanceof Error ? err.message : "Gagal membuka sesi kerja";
         setError(message);
      } finally {
         setActionLoading(false);
      }
   };

   const handleCloseSession = async () => {
      if (!session) return;

      setActionLoading(true);
      setError(null);
      setSuccess(null);

      try {
         const result = await closeShiftSession(session.id);
         setSession(null);
         setSuccess(
            `Sesi kerja berhasil ditutup. Total masuk: ${result.total_transaksi_masuk}, keluar: ${result.total_transaksi_keluar}.`,
         );
         await loadData();
      } catch (err: unknown) {
         const message =
            err instanceof Error ? err.message : "Gagal menutup sesi kerja";
         setError(message);
      } finally {
         setActionLoading(false);
      }
   };

    if (loading) {
       return (
          <LoadingState
             variant="spinner"
             text="Memuat dashboard..."
             className="animate-fade-in p-8"
          />
       );
    }

   return (
      <div className="space-y-5">
         {/* Session Control Card */}
         <Card className="card-interactive border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
               <div>
                  <CardTitle className="text-base flex items-center gap-2">
                     <Activity className="h-4 w-4" />
                     Sesi Kerja Hari Ini
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                     {session
                        ? `Aktif sejak ${formatDateTime(session.waktu_mulai)}`
                        : "Belum ada sesi aktif. Buka sesi untuk mulai mencatat."}
                  </p>
               </div>
               <Badge
                  className={`text-xs font-medium gap-1.5 ${
                     session
                        ? "bg-green-50 text-brand-green border border-green-200/60 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800"
                        : "bg-muted text-muted-foreground border border-border"
                  }`}
               >
                  <div
                     className={`status-dot ${
                        session ? "bg-brand-green" : "bg-muted-foreground"
                     }`}
                  />
                  {session ? "Aktif" : "Belum Aktif"}
               </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
               <div className="flex gap-2">
                  <Button
                     onClick={handleOpenSession}
                     disabled={!!session || actionLoading}
                     size="sm"
                  >
                     {actionLoading && !session ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     ) : (
                        <LogIn className="mr-2 h-4 w-4" />
                     )}
                     Buka Sesi
                  </Button>
                  <Button
                     variant="outline"
                     onClick={handleCloseSession}
                     disabled={!session || actionLoading}
                     size="sm"
                  >
                     {actionLoading && !!session ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     ) : (
                        <LogOut className="mr-2 h-4 w-4" />
                     )}
                     Tutup Sesi
                  </Button>
               </div>
            </CardContent>
         </Card>

         {/* Alerts */}
         {(error || success) && (
            <Alert
               variant={error ? "destructive" : "default"}
               className={`animate-fade-in ${
                  !error
                     ? "bg-green-50/80 border-green-200/60 text-green-800 dark:bg-green-950/50 dark:border-green-800 dark:text-green-300"
                     : ""
               }`}
            >
               <AlertTitle>
                  {error ? "Terjadi Kesalahan" : "Berhasil"}
               </AlertTitle>
               <AlertDescription>{error ?? success}</AlertDescription>
            </Alert>
         )}

         {/* Stats Cards */}
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardCard
               title="Kendaraan Masuk"
               value={String(stats?.total_masuk_hari_ini ?? 0)}
               icon="log-in"
               accent="blue"
               index={0}
               description="Hari ini"
            />
            <DashboardCard
               title="Kendaraan Keluar"
               value={String(stats?.total_keluar_hari_ini ?? 0)}
               icon="log-out"
               accent="violet"
               index={1}
               description="Hari ini"
            />
            <DashboardCard
               title="Total Transaksi"
               value={String(stats?.total_transaksi_hari_ini ?? 0)}
               icon="trending-up"
               accent="blue"
               index={2}
               description="Masuk + Keluar hari ini"
            />
         </div>

          {/* Weekly Trend Charts */}
          <WeeklyTrendChart petugasId={userId ?? undefined} />
      </div>
   );
}
