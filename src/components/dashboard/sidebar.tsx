"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
   Activity,
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
   TrendingUp,
   Users,
   type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLES, type RoleType } from "@/config/roles";
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
   TrendingUp,
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
       { href: "/staf-iw/analytics", label: "Analitik", icon: "TrendingUp" },
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
             <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
                {collapsed ? (
                   <button
                      type="button"
                      onClick={onToggleCollapse}
                      className="btn btn-ghost btn-square btn-sm mx-auto"
                      aria-label="Lebarkan sidebar"
                   >
                      <PanelLeftOpen className="size-5" />
                   </button>
                ) : (
                   <>
                      <Image
                         src="/jr-logo.png"
                         alt="Logo Jasa Raharja"
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
                            Jasa Raharja
                         </span>
                      </div>
                      <button
                         type="button"
                         onClick={onToggleCollapse}
                         className="btn btn-ghost btn-square btn-sm text-sidebar-foreground/70 hover:text-sidebar-foreground"
                         aria-label="Persempit sidebar"
                      >
                         <PanelLeftClose className="size-4" />
                      </button>
                   </>
                )}
             </div>

            {/* Nav */}
            <nav
               className="flex flex-col flex-1 gap-1 overflow-y-auto overflow-x-hidden px-3 py-4"
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
                        aria-label={collapsed ? item.label : undefined}
                        className={cn(
                           "sidebar-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                           collapsed && "justify-center w-12 px-0",
                           active
                              ? "is-active bg-sidebar-primary/15 text-sidebar-primary"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                         {active && (
                            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" aria-hidden="true" />
                         )}
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
