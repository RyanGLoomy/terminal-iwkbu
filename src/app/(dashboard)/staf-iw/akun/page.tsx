import { redirect } from "next/navigation";
import { AdminTerminalAccountsPanel } from "@/components/operasional/admin-terminal-accounts-panel";
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
   void sp;

   return (
      <section className="space-y-6">
          <div>
             <h1 className="text-xl font-bold tracking-tight text-base-content">
                Manajemen Akun
             </h1>
             <p className="text-sm text-base-content/70 mt-1 max-w-2xl">
                Kelola akun <strong>Admin Terminal</strong> (buat, nonaktifkan,
                reset password), verifikasi pendaftaran PO, serta atur peran
                pengguna sistem (admin terminal &amp; staf IW).
             </p>
          </div>

          {terminalOptions.length === 0 ? (
             <div className="rounded-lg border border-base-300 bg-base-100 p-6 text-sm text-base-content/70">
                Belum ada data terminal untuk dikelola.
             </div>
          ) : (
              <AdminTerminalAccountsPanel terminalOptions={terminalOptions} />
          )}

          <RoleManagementPanel />
      </section>
   );
}
