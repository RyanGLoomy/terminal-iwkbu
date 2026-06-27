import { redirect } from "next/navigation";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { getAllArmada } from "@/lib/supabase/queries/verification.server";
import type { Armada } from "@/lib/supabase/queries/verification.types";
import { getPoIwkbuStatus } from "@/lib/supabase/queries/iwkbu-sync.server";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { RekonsiliasiArmadaTable } from "@/components/operasional/rekonsiliasi-armada-table";

export default async function PoRekonsiliasiPage() {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/login");
  const user = actor.user;

  const [armadaRaw, iwkbu] = await Promise.all([
    getAllArmada({ po_id: user.id }),
    getPoIwkbuStatus(user.id),
  ]);
  const armada = armadaRaw as Armada[];
  const { statuses: iwkbuStatuses, summary: iwkbuSummary } = iwkbu;

  const iwkbuMap: Record<string, any> = {};
  for (const s of iwkbuStatuses) {
     iwkbuMap[s.armada_id] = s;
  }

  const terverifikasi = armada.filter(
    (a) => a.status_verifikasi === "terverifikasi",
  ).length;

  return (
    <section className="space-y-6">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Rekonsiliasi Armada
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Status armada, kesiapan operasional, dan kepatuhan IWKBU.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Total Armada"
            value={String(armada.length)}
            description="Semua armada terdaftar"
            icon="bus"
            accent="blue"
            index={0}
          />
          <DashboardCard
            title="Terverifikasi"
            value={String(terverifikasi)}
            description="Siap untuk rekonsiliasi"
            icon="check-circle"
            accent="green"
            index={1}
          />
          <DashboardCard
            title="IWKBU Patuh"
            value={String(iwkbuSummary.ready)}
            description={` dari ${iwkbuSummary.total} tersinkron`}
            icon="shield-check"
            accent="green"
            index={2}
          />
          <DashboardCard
            title="Perlu Perhatian"
            value={String(iwkbuSummary.needs_review + iwkbuSummary.blocked)}
            description={`${iwkbuSummary.blocked} diblokir, ${iwkbuSummary.needs_review} perlu tinjauan`}
            icon="alert-triangle"
            accent="amber"
            index={3}
          />
        </div>

        <RekonsiliasiArmadaTable armada={armada} iwkbuMap={iwkbuMap} />
      </div>
    </section>
  );
}
