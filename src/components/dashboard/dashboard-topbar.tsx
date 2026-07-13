"use client";

import { NotificationBell } from "@/components/dashboard/notification-bell";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { ConnectionIndicator } from "@/components/dashboard/connection-indicator";
import { UserMenu } from "@/components/dashboard/user-menu";
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import type { RoleType } from "@/config/roles";

interface DashboardTopbarProps {
   userName: string;
   userRole: RoleType;
}

export function DashboardTopbar({ userName, userRole }: DashboardTopbarProps) {
   return (
      <header className="sticky top-0 z-30 hidden h-14 items-center justify-between gap-4 border-b border-base-300 bg-base-100/95 px-4 lg:flex lg:px-6">
         <DashboardBreadcrumb />
          <div className="flex items-center gap-1.5">
             <ConnectionIndicator />
             <NotificationBell />
            <ThemeToggle />
            <div className="mx-1 h-6 w-px bg-border" />
            <UserMenu userName={userName} userRole={userRole} />
         </div>
      </header>
   );
}
