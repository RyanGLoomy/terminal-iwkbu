import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { POArmadaManager } from "@/components/verification/po-armada-manager";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { getPoIwkbuStatus } from "@/lib/supabase/queries/iwkbu-sync.server";
import { PoComplianceChartClient } from "@/components/dashboard/po-compliance-chart-client";

export default async function PODashboard() {
   const supabase = await createClient();
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   const user = actor.user;

    const { data: poData } = await supabase
      .from("po")
      .select("status_verifikasi, kode_po, nama_perusahaan, keterangan_verifikasi")
      .eq("id", user.id)
      .single();

   if (!poData) {
      return (
         <section className="space-y-6">
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Dashboard PO
            </h1>
            <Alert variant="destructive">
               <AlertCircle className="h-4 w-4" aria-hidden="true" />
               <AlertDescription>
                  <strong>Data PO tidak ditemukan</strong>
                  <br />
                  Akun Anda belum terhubung ke data PO. Silakan hubungi admin.
               </AlertDescription>
            </Alert>
         </section>
      );
   }

   if (poData.status_verifikasi === "menunggu") {
      return (
         <section className="space-y-6">
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Dashboard PO
            </h1>
            <Alert className="bg-accent/10 border-accent/30">
               <AlertCircle className="h-4 w-4 text-accent" aria-hidden="true" />
               <AlertDescription className="text-accent-foreground">
                  <strong>Menunggu Verifikasi</strong>
                  <br />
                  Akun Anda sedang menunggu verifikasi dari Staf IW Jasa
                  Raharja. Anda akan menerima notifikasi setelah akun
                  diverifikasi.
               </AlertDescription>
            </Alert>
         </section>
      );
   }

   if (poData.status_verifikasi === "ditolak") {
      return (
         <section className="space-y-6">
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Dashboard PO
            </h1>
            <Alert variant="destructive">
               <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
                   <strong>Registrasi Ditolak</strong>
                   <br />
                   {poData.keterangan_verifikasi && (
                     <>
                       {poData.keterangan_verifikasi}
                       <br />
                     </>
                   )}
                   Mohon hubungi Staf IW Jasa Raharja untuk informasi lebih
                   lanjut.
                </AlertDescription>
            </Alert>
         </section>
      );
   }

   // PO aktif - fetch summary data
   const [armadaRes, findingsRes, iwkbuData] = await Promise.all([
      supabase
         .from("armada")
         .select("id, status_verifikasi, status_operasional")
         .eq("po_id", user.id),
      supabase
         .from("findings")
         .select("id")
         .eq("po_id", user.id)
         .in("status", ["open", "on_progress"]),
      getPoIwkbuStatus(user.id).catch(() => ({ summary: { total: 0, ready: 0, needs_review: 0, blocked: 0 } })),
   ]);

   const armadaList = armadaRes.data ?? [];
   const totalArmada = armadaList.length;
    const armadaTerverifikasi = armadaList.filter(
       (a: { status_verifikasi: string }) =>
          a.status_verifikasi === "terverifikasi",
    ).length;
    const armadaMenunggu = armadaList.filter(
       (a: { status_verifikasi: string }) =>
          a.status_verifikasi === "menunggu",
    ).length;
   const temuanAktif = (findingsRes.data ?? []).length;
   const iwkbuSummary = iwkbuData.summary;

   return (
      <section className="space-y-6">
         <div className="flex justify-between items-center">
            <div>
               <h1 className="text-xl font-bold tracking-tight text-base-content">
                  Dashboard PO
               </h1>
               <p className="text-sm text-base-content/70 mt-1">
                  {poData.kode_po} - {poData.nama_perusahaan}
               </p>
            </div>
         </div>

         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
               title="Total Armada"
               value={String(totalArmada)}
               description={`${armadaTerverifikasi} terverifikasi, ${armadaMenunggu} menunggu`}
               icon="bus"
               accent="blue"
            />
            <DashboardCard
               title="IWKBU Patuh"
               value={String(iwkbuSummary.ready)}
               description={`${iwkbuSummary.needs_review} perlu tinjauan, ${iwkbuSummary.blocked} diblokir`}
               icon="shield-check"
               accent="green"
            />
            <DashboardCard
               title="Temuan Aktif"
               value={String(temuanAktif)}
               description="Open / On Progress"
               icon="alert-triangle"
               accent={temuanAktif > 0 ? "amber" : "default"}
            />
            <DashboardCard
               title="Armada Menunggu"
               value={String(armadaMenunggu)}
               description="Menunggu verifikasi staf IW"
               icon="clock"
               accent={armadaMenunggu > 0 ? "violet" : "default"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
             <PoComplianceChartClient data={iwkbuSummary} />
             <div className="rounded-xl border border-base-300 bg-base-100 p-5">
                <h3 className="text-sm font-semibold text-base-content mb-4">
                   Ringkasan Armada
                </h3>
                <div className="space-y-3">
                   <div className="flex items-center justify-between">
                      <span className="text-sm text-base-content/70">Terverifikasi</span>
                      <span className="text-lg font-bold text-success">{armadaTerverifikasi}</span>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-sm text-base-content/70">Menunggu Verifikasi</span>
                      <span className="text-lg font-bold text-warning">{armadaMenunggu}</span>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-sm text-base-content/70">Temuan Aktif</span>
                      <span className="text-lg font-bold text-error">{temuanAktif}</span>
                   </div>
                   <div className="flex items-center justify-between border-t border-base-300 pt-3">
                      <span className="text-sm font-medium text-base-content">Total Armada</span>
                      <span className="text-2xl font-extrabold text-base-content">{totalArmada}</span>
                   </div>
                </div>
             </div>
          </div>

          <POArmadaManager poId={user.id} />
      </section>
   );
}
