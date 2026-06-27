import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerifikasiPOTable } from "@/components/verification/verifikasi-po-table";
import { VerifikasiArmadaTable } from "@/components/verification/verifikasi-armada-table";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Card, CardContent } from "@/components/ui/card";
import { StafIWStatsChartClient } from "@/components/dashboard/staf-iw-stats-chart-client";
import Link from "next/link";
import {
   getAllPO,
   getAllArmada,
} from "@/lib/supabase/queries/verification.server";

export default async function StafIWDashboard() {
   // Batch all queries in parallel for faster load
   const [poMenunggu, poAktif, armadaMenunggu, armadaTerverifikasi, armadaDitolak] = await Promise.all([
      getAllPO("menunggu"),
      getAllPO("aktif"),
      getAllArmada({ status_verifikasi: "menunggu" }),
      getAllArmada({ status_verifikasi: "terverifikasi" }),
      getAllArmada({ status_verifikasi: "ditolak" }),
   ]);

   return (
      <section className="space-y-6">
         <div className="space-y-5">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Pengawasan Integrasi Data
               </h1>
               <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Pusat pengelolaan data sumber PO dan armada sebelum dipakai
                  untuk rekonsiliasi, audit trail, dan tindak lanjut.
               </p>
            </div>

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

             <StafIWStatsChartClient
                poMenunggu={poMenunggu.length}
                poAktif={poAktif.length}
                armadaMenunggu={armadaMenunggu.length}
                armadaTerverifikasi={armadaTerverifikasi.length}
                armadaDitolak={armadaDitolak.length}
             />

             <Card className="border-border">
               <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-5">
                  <div>
                     <p className="text-sm font-medium text-foreground">
                        Alur kerja staf IW
                     </p>
                     <p className="text-sm text-muted-foreground">
                        Verifikasi data sumber, lanjutkan ke rekonsiliasi, lalu
                        pantau audit trail untuk tindak lanjut.
                     </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                     <Link
                        href="/staf-iw/rekonsiliasi"
                        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                     >
                        Buka Rekonsiliasi
                     </Link>
                     <Link
                        href="/staf-iw/audit-trail"
                        className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                     >
                        Lihat Audit Trail
                     </Link>
                  </div>
               </CardContent>
            </Card>
         </div>

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
