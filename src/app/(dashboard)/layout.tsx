import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";

export default async function DashboardLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   const actor = await getAuthenticatedActor();

   if (!actor) {
      redirect("/login");
   }

   if (!actor.role) {
      redirect("/error");
   }

   const userName =
      (actor.user.user_metadata?.full_name as string | undefined) ??
      actor.user.email ??
      "Pengguna";

   const cookieStore = await cookies();
   const sidebarCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";

   return (
      <DashboardShell userName={userName} userRole={actor.role} initialCollapsed={sidebarCollapsed}>
         {children}
      </DashboardShell>
   );
}
