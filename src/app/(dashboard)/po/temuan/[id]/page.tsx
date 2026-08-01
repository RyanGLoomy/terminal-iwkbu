import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IconChevronLeft } from "@tabler/icons-react";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { getFindingById } from "@/lib/supabase/queries/findings.server";
import { FindingDetailHeader } from "@/components/operasional/finding-detail-header";
import { FindingThread } from "@/components/operasional/finding-thread";
import { PoClarificationForm } from "@/components/operasional/po-clarification-form";

export default async function PoFindingDetailPage({
   params,
}: {
   params: Promise<{ id: string }>;
}) {
   const { id } = await params;
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");

   const userId = actor.user.id;
   // gate eksplisit: PO hanya boleh melihat temuan miliknya (RS juga berlaku).
   const finding = await getFindingById(id, userId);
   if (!finding) notFound();

   const closed = finding.status === "closed";

   return (
      <section className="space-y-5">
         <Link
            href="/po/temuan"
            className="inline-flex items-center gap-1 text-sm text-base-content/70 hover:text-base-content"
         >
            <IconChevronLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke daftar temuan
         </Link>

         <FindingDetailHeader finding={finding} />

         <div className="border-t border-base-300 pt-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-base-content/60">
               Percakapan & Tindak Lanjut
            </h2>
            <FindingThread finding={finding} />
         </div>

         <div className="border-t border-base-300 pt-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-base-content/60">
               Kirim Klarifikasi
            </h2>
             {closed ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300">
                   Temuan ini sudah ditutup oleh Staf IW.
                   {finding.resolution_note && (
                      <p className="mt-1 text-xs font-normal text-emerald-600 dark:text-green-400">
                         Catatan: {finding.resolution_note}
                      </p>
                   )}
                </div>
             ) : (
                <>
                   {(finding.finding_clarifications?.length ?? 0) === 0 && (
                      <div className="mb-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-base-content/80">
                         Berikan respons Anda untuk temuan ini menggunakan form di bawah.
                         Pilih <strong>Melengkapi Bukti</strong> untuk menambah informasi,
                         <strong> Menerima</strong> jika setuju, atau
                         <strong> Menolak</strong> jika tidak sepakat.
                      </div>
                   )}
                   <PoClarificationForm findingId={finding.id} />
                </>
             )}
         </div>
      </section>
   );
}
