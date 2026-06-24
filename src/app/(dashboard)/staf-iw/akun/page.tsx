import { redirect } from "next/navigation";
import { ManagementAkunPanel } from "@/components/operasional/management-akun-panel";
import { RoleManagementPanel } from "@/components/operasional/role-management-panel";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function StafIwAkunPage({
   searchParams,
}: {
   searchParams: Promise<{ terminalId?: string }>;
}) {
   const actor = await getAuthenticatedActor();

   if (!actor) redirect("/login");
   if (actor.role !== "staf-iw") redirect("/error");

   const adminClient = createAdminClient();
   const { data: terminals, error } = await adminClient
      .from("terminals")
      .select("id, kode, nama")
      .order("nama", { ascending: true });

   if (error) throw error;

   const terminalOptions = terminals ?? [];
   const sp = await searchParams;
   const requestedTerminal = typeof sp.terminalId === "string" ? sp.terminalId : null;
   const initialTerminalId =
      requestedTerminal && terminalOptions.some((t) => t.id === requestedTerminal)
         ? requestedTerminal
         : terminalOptions[0]?.id ?? "";

   return (
      <section className="space-y-6">
         <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
               Manajemen Akun Terminal
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
               Kelola akun loket dan PIN petugas untuk seluruh terminal.
            </p>
         </div>

          {terminalOptions.length === 0 ? (
             <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                Belum ada data terminal untuk dikelola.
             </div>
          ) : (
              <ManagementAkunPanel
                 terminalId={initialTerminalId}
                 terminalOptions={terminalOptions}
              />
          )}

          <RoleManagementPanel />
      </section>
   );
}
