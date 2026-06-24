import { RekonsiliasiPanel } from "@/components/operasional/rekonsiliasi-panel";
import { PeriodeRekonsiliasiPanel } from "@/components/operasional/periode-rekonsiliasi-panel";
import { getRekonsiliasiData } from "@/lib/supabase/queries/rekonsiliasi.server";

export default async function RekonsiliasiPage() {
   const { poAktif, poMenunggu, armada } = await getRekonsiliasiData();

   return (
      <section className="space-y-6">
          <div>
             <h1 className="text-xl font-bold tracking-tight text-foreground">
                Rekonsiliasi Data Sumber
             </h1>
             <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Pemadanan awal data PO dan armada untuk memastikan sumber data
                siap digunakan dalam pengawasan dan analisis.
             </p>
          </div>

          <PeriodeRekonsiliasiPanel />

          <RekonsiliasiPanel
             poAktif={poAktif}
             poMenunggu={poMenunggu}
             armada={armada}
          />
      </section>
   );
}
