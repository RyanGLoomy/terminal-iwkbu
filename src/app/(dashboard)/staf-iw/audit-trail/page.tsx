import { AuditTrailPanel } from "@/components/operasional/audit-trail-panel";

export default function AuditTrailPage() {
   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
               Audit Trail
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
               Jejak aktivitas penting untuk monitoring, evaluasi, dan tindak
               lanjut pengawasan sistem.
            </p>
         </div>

         <AuditTrailPanel />
      </section>
   );
}
