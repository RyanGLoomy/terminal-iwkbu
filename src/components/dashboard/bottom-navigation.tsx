"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
   Activity,
   ClipboardList,
   FileText,
   LayoutDashboard,
   MoreHorizontal,
   RefreshCw,
   Search,
   Settings,
   Shield,
   Users,
   CalendarClock,
   type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLES, DEFAULT_ROUTES, ROLE_DISPLAY_NAMES, type RoleType } from "@/config/roles";
import {
   Sheet,
   SheetContent,
   SheetHeader,
   SheetTitle,
   SheetTrigger,
} from "@/components/ui/sheet";
import { bottomNavItems } from "@/components/dashboard/sidebar";

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

interface BottomNavigationProps {
   userRole: RoleType;
}

export function BottomNavigation({ userRole }: BottomNavigationProps) {
   const pathname = usePathname();
   const [moreOpen, setMoreOpen] = useState(false);

   const primaryItems = bottomNavItems[userRole] || [];

   const isActive = (href: string) => {
      const normalized = pathname?.replace(/\/+$/, "") || "";
      // Dashboard route: exact match only (bukan startsWith) agar tak selalu
      // menyala di child page (/po/temuan dll).
      if (href === DEFAULT_ROLES[userRole]) {
         return normalized === href;
      }
      return normalized === href || normalized.startsWith(href + "/");
   };

   const allItems = getAllItemsForRole(userRole);
   const moreItems = allItems.filter(
      (item) => !primaryItems.some((p) => p.href === item.href),
   );

   return (
      <>
         <nav
            className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-base-300 bg-base-100/95 lg:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            aria-label="Navigasi utama"
         >
            {primaryItems.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard;
                const active = isActive(item.href);
                return (
                   <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      aria-label={item.label}
                      className={cn(
                         "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors touch-manipulation",
                         active
                            ? "text-primary"
                            : "text-base-content/70 hover:text-base-content",
                      )}
                   >
                      <div className="relative">
                         <Icon className="size-5" aria-hidden="true" />
                         {active && (
                            <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" aria-hidden="true" />
                         )}
                      </div>
                      <span className="text-[10px] font-medium leading-none">
                         {item.label}
                      </span>
                   </Link>
                );
             })}

             {moreItems.length > 0 && (
                <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                   <SheetTrigger asChild>
                      <button
                         type="button"
                         aria-label="Menu lainnya"
                         aria-expanded={moreOpen}
                         aria-haspopup="dialog"
                         className={cn(
                            "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors touch-manipulation",
                            moreOpen
                               ? "text-primary"
                               : "text-base-content/70 hover:text-base-content",
                         )}
                      >
                         <MoreHorizontal className="size-5" aria-hidden="true" />
                         <span className="text-[10px] font-medium leading-none">
                            Lainnya
                         </span>
                      </button>
                   </SheetTrigger>
                   <SheetContent side="bottom" className="rounded-t-2xl">
                      <SheetHeader>
                         <SheetTitle>Menu Lainnya</SheetTitle>
                      </SheetHeader>
                      <div className="grid grid-cols-3 gap-3 px-4 pb-8 pt-4">
                         {moreItems.map((item) => {
                            const Icon = iconMap[item.icon] || LayoutDashboard;
                            const active = isActive(item.href);
                            return (
                               <Link
                                  key={item.href}
                                  href={item.href}
                                  aria-current={active ? "page" : undefined}
                                  onClick={() => setMoreOpen(false)}
                                  className={cn(
                                     "flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors touch-manipulation",
                                     active
                                        ? "border-primary/30 bg-primary/5 text-primary"
                                        : "border-base-300 text-base-content/70 hover:bg-base-200",
                                  )}
                               >
                                  <Icon className="size-6" aria-hidden="true" />
                                  <span className="text-xs font-medium text-center leading-tight">
                                     {item.label}
                                  </span>
                               </Link>
                            );
                         })}
                      </div>
                   </SheetContent>
                </Sheet>
             )}
         </nav>
      </>
   );
}

function getAllItemsForRole(role: RoleType) {
   const items: Array<{ href: string; label: string; icon: string }> = {
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
         { href: "/admin-terminal/rekap", label: "Rekap", icon: "Search" },
         { href: "/admin-terminal/sesi", label: "Sesi", icon: "CalendarClock" },
         { href: "/admin-terminal/laporan", label: "Laporan", icon: "FileText" },
         { href: "/admin-terminal/master-data", label: "Master Data", icon: "Settings" },
      ],
      [ROLES.STAF_IW]: [
         { href: "/staf-iw", label: "Dashboard", icon: "LayoutDashboard" },
         { href: "/staf-iw/akun", label: "Akun", icon: "Users" },
         { href: "/staf-iw/rekonsiliasi", label: "Rekonsiliasi", icon: "Activity" },
         { href: "/staf-iw/iwkbu-sync", label: "Sync IWKBU", icon: "RefreshCw" },
         { href: "/staf-iw/master-data", label: "Master Data", icon: "Settings" },
         { href: "/staf-iw/temuan", label: "Temuan", icon: "Shield" },
         { href: "/staf-iw/audit-trail", label: "Audit Trail", icon: "ClipboardList" },
      ],
   }[role] || [];

   return items;
}
