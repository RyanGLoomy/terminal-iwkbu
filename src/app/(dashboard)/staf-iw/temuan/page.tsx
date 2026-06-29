import { StafFindingsPanel } from "@/components/operasional/staf-findings-panel";
import {
   getAllArmada,
   getAllPO,
} from "@/lib/supabase/queries/verification.server";
import { getStaffFindings } from "@/lib/supabase/queries/findings.server";

export default async function StafIwTemuanPage({
   searchParams,
}: {
   searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
   const sp = await searchParams;

   const prefill: Record<string, string> = {};
   for (const key of [
      "poId",
      "armadaId",
      "nomorPolisi",
      "judul",
      "deskripsi",
   ]) {
      const val = sp[key];
      if (typeof val === "string" && val.trim()) {
         prefill[key] = val.trim();
      }
   }

   const [findings, poList, armadaList] = await Promise.all([
      getStaffFindings(),
      getAllPO(),
      getAllArmada(),
   ]);

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Temuan & Klarifikasi
            </h1>
            <p className="text-sm text-base-content/70 mt-1 max-w-2xl">
               Catat temuan dari hasil rekonsiliasi, lalu pantau klarifikasi PO
               sampai status dapat ditutup.
            </p>
         </div>

          <StafFindingsPanel
             initialFindings={findings}
             poOptions={poList.map((item) => ({
                id: item.id,
                label: `${item.kode_po} - ${item.nama_perusahaan}`,
             }))}
             armadaOptions={armadaList.map((item) => ({
                id: item.id,
                label: `${item.nomor_polisi}${item.nomor_lambung ? ` · ${item.nomor_lambung}` : ""}`,
             }))}
             prefill={Object.keys(prefill).length > 0 ? prefill : undefined}
          />
      </section>
   );
}
