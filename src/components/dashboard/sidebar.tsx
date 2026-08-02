"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
   IconActivity,
   IconCalendarClock,
   IconClipboardList,
   IconFileText,
   IconLayoutDashboard,
   IconRefresh,
   IconSearch,
   IconSettings,
   IconShield,
   IconUsers,
} from "@tabler/icons-react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { FC, SVGProps } from "react";
type IconComponent = FC<SVGProps<SVGSVGElement> & { size?: string | number }>;
import { cn } from "@/lib/utils";
import { ROLES, type RoleType } from "@/config/roles";
import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
} from "@/components/ui/tooltip";

const iconMap: Record<string, IconComponent> = {
   LayoutDashboard: IconLayoutDashboard,
   ClipboardList: IconClipboardList,
   RefreshCw: IconRefresh,
   FileText: IconFileText,
   Users: IconUsers,
   Search: IconSearch,
   Shield: IconShield,
   Activity: IconActivity,
   CalendarClock: IconCalendarClock,
   Settings: IconSettings,
};

const menuItems: Record<
   RoleType,
   Array<{ href: string; label: string; icon: string }>
> = {
   [ROLES.PO]: [
      { href: "/po", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/po/temuan", label: "Temuan & Klarifikasi", icon: "ClipboardList" },
      { href: "/po/rekonsiliasi", label: "Rekonsiliasi", icon: "Activity" },
   ],
   [ROLES.PETUGAS_LOKET]: [
      { href: "/loket", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/loket/pencatatan", label: "Pencatatan", icon: "ClipboardList" },
      { href: "/loket/riwayat", label: "Riwayat", icon: "FileText" },
   ],
   [ROLES.ADMIN_TERMINAL]: [
      { href: "/admin-terminal", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/admin-terminal/petugas", label: "Manajemen Akun", icon: "Users" },
      { href: "/admin-terminal/rekap", label: "Rekap Data", icon: "Search" },
      { href: "/admin-terminal/sesi", label: "Rekap Sesi", icon: "CalendarClock" },
      { href: "/admin-terminal/laporan", label: "Laporan", icon: "FileText" },
      { href: "/admin-terminal/master-data", label: "Master Data", icon: "Settings" },
   ],
   [ROLES.STAF_IW]: [
      { href: "/staf-iw", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/staf-iw/akun", label: "Manajemen Akun", icon: "Users" },
      { href: "/staf-iw/rekonsiliasi", label: "Rekonsiliasi", icon: "Activity" },
      { href: "/staf-iw/iwkbu-sync", label: "Sync IWKBU", icon: "RefreshCw" },
      { href: "/staf-iw/master-data", label: "Master Data", icon: "Settings" },
       { href: "/staf-iw/temuan", label: "Temuan", icon: "Shield" },
       { href: "/staf-iw/laporan", label: "Laporan", icon: "FileText" },
       { href: "/staf-iw/audit-trail", label: "Audit Trail", icon: "ClipboardList" },
    ],
};

export const bottomNavItems: Record<
   RoleType,
   Array<{ href: string; label: string; icon: string }>
> = {
   [ROLES.PO]: [
      { href: "/po", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/po/temuan", label: "Temuan", icon: "ClipboardList" },
      { href: "/po/rekonsiliasi", label: "Rekonsiliasi", icon: "Activity" },
   ],
   [ROLES.PETUGAS_LOKET]: [
      { href: "/loket", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/loket/pencatatan", label: "Pencatatan", icon: "ClipboardList" },
      { href: "/loket/riwayat", label: "Riwayat", icon: "FileText" },
   ],
   [ROLES.ADMIN_TERMINAL]: [
      { href: "/admin-terminal", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/admin-terminal/petugas", label: "Akun", icon: "Users" },
      { href: "/admin-terminal/laporan", label: "Laporan", icon: "FileText" },
   ],
   [ROLES.STAF_IW]: [
      { href: "/staf-iw", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/staf-iw/temuan", label: "Temuan", icon: "Shield" },
      { href: "/staf-iw/akun", label: "Akun", icon: "Users" },
   ],
};

interface SidebarProps {
   userRole: RoleType;
   collapsed: boolean;
   onToggleCollapse: () => void;
}

export function Sidebar({ userRole, collapsed, onToggleCollapse }: SidebarProps) {
   const pathname = usePathname();
   const items = menuItems[userRole] || [];

   const isActive = (href: string) => {
      const normalized = pathname?.replace(/\/+$/, "") || "";
      if (href === `/${userRole.split("-")[0]}` || href === `/${userRole}`) {
         return normalized === href;
      }
      return normalized === href || normalized.startsWith(href + "/");
   };

   return (
      <TooltipProvider delayDuration={collapsed ? 200 : 9999}>
         <aside
             className={cn(
                "fixed inset-y-0 left-0 z-40 hidden lg:flex lg:flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
                collapsed ? "w-[72px]" : "w-[264px]",
             )}
         >
              {/* Header: JR logo + toggle collapse */}
              <div className={cn("flex h-14 items-center border-b border-sidebar-border px-3", collapsed && "justify-center")}>
                 <div
                    className={cn(
                       "flex items-center gap-3 min-w-0 transition-opacity duration-150",
                       collapsed ? "opacity-0 pointer-events-none absolute inset-0 px-3" : "flex-1 opacity-100 delay-200",
                    )}
                 >
                    <Image
                       src="/jr-mark.png"
                       alt="Logo Jasa Raharja Banten"
                       width={32}
                       height={32}
                       priority
                       className="shrink-0 object-contain"
                    />
                    <div className="min-w-0 flex-1">
                       <span className="block truncate text-sm font-bold leading-tight text-sidebar-foreground">
                          IWKBU Terminal
                       </span>
                       <span className="text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
                          Jasa Raharja Banten
                       </span>
                    </div>
                 </div>
                 <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="btn btn-ghost btn-square btn-sm shrink-0 z-10"
                    aria-label={collapsed ? "Lebarkan sidebar" : "Persempit sidebar"}
                 >
                    {collapsed ? (
                       <PanelLeftOpen className="size-5" />
                    ) : (
                       <PanelLeftClose className="size-4" />
                    )}
                 </button>
              </div>

            {/* Nav */}
            <nav
               className="flex flex-col flex-1 gap-1 overflow-y-auto overflow-x-hidden px-3 py-4"
               aria-label="Menu utama"
            >
               {items.map((item) => {
                  const Icon = iconMap[item.icon] || IconLayoutDashboard;
                  const active = isActive(item.href);
                  const linkContent = (
                     <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        aria-label={collapsed ? item.label : undefined}
                         className={cn(
                           "sidebar-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                           active
                              ? "is-active bg-sidebar-primary/15 text-sidebar-primary"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                         <Icon className={cn("size-5 shrink-0", active && "text-sidebar-primary")} aria-hidden="true" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                     </Link>
                  );

                  if (collapsed) {
                     return (
                        <Tooltip key={item.href}>
                           <TooltipTrigger asChild>
                              {linkContent}
                           </TooltipTrigger>
                           <TooltipContent side="right" sideOffset={8}>
                              {item.label}
                           </TooltipContent>
                        </Tooltip>
                     );
                  }

                   return linkContent;
                })}
             </nav>
          </aside>
      </TooltipProvider>
   );
}
