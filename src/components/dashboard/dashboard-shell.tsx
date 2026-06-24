"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { BottomNavigation } from "@/components/dashboard/bottom-navigation";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { UserMenu } from "@/components/dashboard/user-menu";
import { cn } from "@/lib/utils";
import type { RoleType } from "@/config/roles";

const COLLAPSE_KEY = "sidebar-collapsed";

interface DashboardShellProps {
   userName: string;
   userRole: RoleType;
   children: React.ReactNode;
}

export function DashboardShell({
   userName,
   userRole,
   children,
}: DashboardShellProps) {
   const [collapsed, setCollapsed] = useState(false);
   const [mounted, setMounted] = useState(false);

   useEffect(() => {
      const stored = localStorage.getItem(COLLAPSE_KEY);
      setCollapsed(stored === "true");
      setMounted(true);
   }, []);

   const toggleCollapse = () => {
      const next = !collapsed;
      setCollapsed(next);
      localStorage.setItem(COLLAPSE_KEY, String(next));
   };

   return (
      <div className="min-h-screen bg-background">
         <a
            href="#main-content"
            className="sr-only z-50 rounded-md bg-background px-4 py-2 text-sm font-medium shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
         >
            Lewati ke konten utama
         </a>

         {/* Desktop sidebar */}
         <Sidebar
            userRole={userRole}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
         />

         {/* Main area */}
         <div
            className={cn(
               "flex min-h-screen flex-col transition-[padding] duration-200",
               mounted && (collapsed ? "lg:pl-[72px]" : "lg:pl-[264px]"),
            )}
         >
            {/* Desktop topbar */}
            <div className="hidden lg:block">
               <DashboardTopbar userName={userName} userRole={userRole} />
            </div>

            {/* Mobile topbar */}
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur lg:hidden">
               <span className="text-sm font-bold text-foreground">
                  IWKBU Terminal
               </span>
               <div className="flex items-center gap-1">
                  <NotificationBell />
                  <ThemeToggle />
                  <div className="mx-0.5 h-6 w-px bg-border" />
                  <UserMenu userName={userName} userRole={userRole} />
               </div>
            </header>

            {/* Main content */}
            <main
               id="main-content"
               className="flex-1 overflow-auto p-4 pb-20 sm:p-6 lg:p-8 lg:pb-8"
            >
               <div className="mx-auto w-full max-w-[1500px]">{children}</div>
            </main>
         </div>

         {/* Mobile bottom navigation */}
         <BottomNavigation userRole={userRole} />
      </div>
   );
}
