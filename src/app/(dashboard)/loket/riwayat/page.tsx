import { RekapHarianPanel } from "@/components/operasional/rekap-harian-panel";

export default function LoketRiwayatPage() {
   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Rekap Harian
            </h1>
            <p className="text-sm text-base-content/70 mt-1">
               Rekap sederhana kendaraan masuk dan keluar per hari.
            </p>
         </div>
         <RekapHarianPanel />
      </section>
   );
}
