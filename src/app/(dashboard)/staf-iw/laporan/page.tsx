import { redirect } from "next/navigation";
import { ROLES } from "@/config/roles";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { getStaffFindings } from "@/lib/supabase/queries/findings.server";
import {
   getAllPO,
   getAllArmada,
} from "@/lib/supabase/queries/verification.server";
import {
   StafIwLaporanPanel,
   type StafIwLaporanStats,
} from "@/components/operasional/staf-iw-laporan-panel";

export default async function StafIwLaporanPage() {
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   if (actor.role !== ROLES.STAF_IW) redirect("/error");

   // Ambil data global secara paralel untuk laporan rekonsiliasi kepatuhan.
   const [findings, poAktif, poMenunggu, armadaTerverifikasi, armadaMenunggu, armadaDitolak] =
      await Promise.all([
         getStaffFindings(500).catch(() => []),
         getAllPO("aktif").catch(() => []),
         getAllPO("menunggu").catch(() => []),
         getAllArmada({ status_verifikasi: "terverifikasi" }).catch(() => []),
         getAllArmada({ status_verifikasi: "menunggu" }).catch(() => []),
         getAllArmada({ status_verifikasi: "ditolak" }).catch(() => []),
      ]);

   const stats: StafIwLaporanStats = {
      poAktif: poAktif.length,
      poMenunggu: poMenunggu.length,
      armadaTerverifikasi: armadaTerverifikasi.length,
      armadaMenunggu: armadaMenunggu.length,
      armadaDitolak: armadaDitolak.length,
   };

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Laporan &amp; Ekspor
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-base-content/70">
               Ringkasan rekonsiliasi kepatuhan IWKBU lintas terminal dan PO,
               daftar temuan, serta ekspor laporan.
            </p>
         </div>
         <StafIwLaporanPanel findings={findings} stats={stats} />
      </section>
   );
}
