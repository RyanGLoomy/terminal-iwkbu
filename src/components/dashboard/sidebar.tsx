"use client";

import { useEffect, useState, type ElementType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
   Activity,
   Bus,
   CalendarClock,
   ClipboardList,
   FileText,
   LayoutDashboard,
   PanelLeftClose,
   PanelLeftOpen,
   RefreshCw,
   Search,
   Settings,
   Shield,
   Users,
   type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLES, ROLE_DISPLAY_NAMES, type RoleType } from "@/config/roles";
import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
} from "@/components/ui/tooltip";

const iconMap: Record<string, LucideIcon> = {
   LayoutDashboard,
   ClipboardList,
   RefreshCw,
   FileText,
   Users,
   Search,
   Shield,
   Activity,
   CalendarClock,
   Settings,
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
               "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
               collapsed ? "w-[72px]" : "w-[264px]",
            )}
         >
            {/* Logo */}
            <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
               <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                  <Bus className="size-5 text-sidebar-primary" />
               </div>
               {!collapsed && (
                  <div className="min-w-0">
                     <span className="block truncate text-sm font-bold leading-tight text-sidebar-foreground">
                        IWKBU Terminal
                     </span>
                     <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                        Jasa Raharja
                     </span>
                  </div>
               )}
            </div>

            {/* Collapse toggle */}
            <button
               type="button"
               onClick={onToggleCollapse}
               className="absolute -right-3 top-20 z-50 flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
               aria-label={collapsed ? "Lebarkan sidebar" : "Persempit sidebar"}
            >
               {collapsed ? (
                  <PanelLeftOpen className="size-3.5" />
               ) : (
                  <PanelLeftClose className="size-3.5" />
               )}
            </button>

            {/* Nav */}
            <nav
               className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4"
               aria-label="Menu utama"
            >
               {items.map((item) => {
                  const Icon = iconMap[item.icon] || LayoutDashboard;
                  const active = isActive(item.href);
                  const linkContent = (
                     <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                           "sidebar-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                           collapsed && "justify-center px-0",
                           active
                              ? "is-active bg-sidebar-primary/15 text-sidebar-primary"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                     >
                        <Icon className={cn("size-5 shrink-0", active && "text-sidebar-primary")} />
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

            {/* Role badge */}
            <div className="border-t border-sidebar-border px-4 py-3">
               {!collapsed ? (
                  <div className="flex items-center gap-2 text-xs">
                     <span className="size-2 rounded-full bg-sidebar-primary" />
                     <span className="font-semibold text-sidebar-foreground/50">
                        {ROLE_DISPLAY_NAMES[userRole]}
                     </span>
                  </div>
               ) : (
                  <div className="flex justify-center">
                     <span className="size-2 rounded-full bg-sidebar-primary" />
                  </div>
               )}
            </div>
         </aside>
      </TooltipProvider>
   );
}
