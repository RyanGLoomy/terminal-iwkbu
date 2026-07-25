import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { getFindingById } from "@/lib/supabase/queries/findings.server";
import { ROLES } from "@/config/roles";
import { FindingDetailHeader } from "@/components/operasional/finding-detail-header";
import { FindingThread } from "@/components/operasional/finding-thread";
import { StafFindingDetailActions } from "@/components/operasional/staf-finding-detail-actions";

export default async function StafFindingDetailPage({
   params,
}: {
   params: Promise<{ id: string }>;
}) {
   const { id } = await params;
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");
   if (actor.role !== ROLES.STAF_IW) redirect("/staf-iw");

   const finding = await getFindingById(id);
   if (!finding) notFound();

   return (
      <section className="space-y-5">
         <Link
            href="/staf-iw/temuan"
            className="inline-flex items-center gap-1 text-sm text-base-content/70 hover:text-base-content"
         >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
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
            <StafFindingDetailActions finding={finding} />
         </div>
      </section>
   );
}
