import { PencatatanPanel } from "@/components/operasional/pencatatan-panel";

export default function LoketPencatatanPage() {
   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content">
               Pencatatan Operasional
            </h1>
            <p className="text-sm text-base-content/70 mt-1">
               Catat kendaraan masuk dan keluar selama sesi kerja.
            </p>
         </div>
         <PencatatanPanel />
      </section>
   );
}
