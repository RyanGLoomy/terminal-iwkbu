import { PencatatanPanel } from "@/components/operasional/pencatatan-panel";

export default function LoketPencatatanPage() {
   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
               Pencatatan Operasional
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
               Catat kendaraan masuk dan keluar selama sesi kerja.
            </p>
         </div>
         <PencatatanPanel />
      </section>
   );
}
