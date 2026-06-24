"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
   Breadcrumb,
   BreadcrumbItem,
   BreadcrumbLink,
   BreadcrumbList,
   BreadcrumbPage,
   BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const ROUTE_LABELS: Record<string, string> = {
   po: "PO",
   loket: "Loket",
   "staf-iw": "Staf IW",
   "admin-terminal": "Admin Terminal",
   profile: "Profil",
   pencatatan: "Pencatatan",
   riwayat: "Riwayat",
   pin: "PIN",
   armada: "Armada",
   temuan: "Temuan",
   rekonsiliasi: "Rekonsiliasi",
   akun: "Manajemen Akun",
   "audit-trail": "Audit Trail",
   "iwkbu-sync": "Sync IWKBU",
   "master-data": "Master Data",
   petugas: "Manajemen Akun",
   rekap: "Rekap Data",
   sesi: "Rekap Sesi",
   laporan: "Laporan",
};

export function DashboardBreadcrumb() {
   const pathname = usePathname();

   if (!pathname) return null;

   const segments = pathname.split("/").filter(Boolean);

   if (segments.length === 0) {
      return null;
   }

   const crumbs = segments.map((seg, idx) => {
      const href = "/" + segments.slice(0, idx + 1).join("/");
      const label = ROUTE_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
      const isLast = idx === segments.length - 1;
      return { href, label, isLast };
   });

   if (crumbs.length === 1) {
      return (
         <Breadcrumb>
            <BreadcrumbList>
               <BreadcrumbItem>
                  <BreadcrumbPage>{crumbs[0].label}</BreadcrumbPage>
               </BreadcrumbItem>
            </BreadcrumbList>
         </Breadcrumb>
      );
   }

   return (
      <Breadcrumb>
         <BreadcrumbList>
            {crumbs.map((crumb, idx) => (
               <div key={crumb.href} className="flex items-center gap-1.5">
                  <BreadcrumbItem>
                     {crumb.isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                     ) : (
                        <>
                           <BreadcrumbLink asChild>
                              <Link href={crumb.href}>{crumb.label}</Link>
                           </BreadcrumbLink>
                        </>
                     )}
                  </BreadcrumbItem>
                  {!crumb.isLast && <BreadcrumbSeparator />}
               </div>
            ))}
         </BreadcrumbList>
      </Breadcrumb>
   );
}
