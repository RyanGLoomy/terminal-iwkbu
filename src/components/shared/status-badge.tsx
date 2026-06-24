import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusCategory =
   | "operasional"
   | "verifikasi"
   | "severity"
   | "finding"
   | "recon"
   | "po"
   | "sync"
   | "transaksi"
   | "user";

const STATUS_MAP: Record<
   StatusCategory,
   Record<string, { label: string; className: string }>
> = {
    operasional: {
       aktif: {
          label: "Aktif",
          className:
             "bg-green-50 text-brand-green border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
       },
       tidak_aktif: {
          label: "Tidak Aktif",
          className:
             "bg-muted text-muted-foreground border-border",
       },
       nonaktif: {
          label: "Nonaktif",
          className:
             "bg-muted text-muted-foreground border-border",
       },
       cadangan: {
          label: "Cadangan",
          className:
             "bg-primary/10 text-primary border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
       },
       rusak: {
          label: "Rusak",
          className:
             "bg-red-50 text-destructive border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
       },
       perawatan: {
          label: "Perawatan",
          className:
             "bg-amber-50 text-accent border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
       },
       dijual: {
          label: "Dijual",
          className:
             "bg-muted text-muted-foreground border-border",
       },
    },
   verifikasi: {
      menunggu: {
         label: "Menunggu",
         className:
            "bg-amber-50 text-accent border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
      },
      terverifikasi: {
         label: "Terverifikasi",
         className:
            "bg-green-50 text-brand-green border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
      },
      ditolak: {
         label: "Ditolak",
         className:
            "bg-red-50 text-destructive border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
      },
   },
    severity: {
       rendah: {
          label: "Rendah",
          className:
             "bg-primary/10 text-primary border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
       },
       low: {
          label: "Rendah",
          className:
             "bg-primary/10 text-primary border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
       },
       sedang: {
          label: "Sedang",
          className:
             "bg-amber-50 text-accent border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
       },
       medium: {
          label: "Sedang",
          className:
             "bg-amber-50 text-accent border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
       },
       tinggi: {
          label: "Tinggi",
          className:
             "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
       },
       high: {
          label: "Tinggi",
          className:
             "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
       },
       kritis: {
          label: "Kritis",
          className:
             "bg-red-50 text-destructive border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
       },
    },
    finding: {
       terbuka: {
          label: "Terbuka",
          className:
             "bg-amber-50 text-accent border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
       },
       open: {
          label: "Terbuka",
          className:
             "bg-amber-50 text-accent border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
       },
       dalam_proses: {
          label: "Dalam Proses",
          className:
             "bg-primary/10 text-primary border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
       },
       on_progress: {
          label: "Dalam Proses",
          className:
             "bg-primary/10 text-primary border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
       },
       selesai: {
          label: "Selesai",
          className:
             "bg-green-50 text-brand-green border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
       },
       closed: {
          label: "Selesai",
          className:
             "bg-green-50 text-brand-green border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
       },
       ditolak: {
          label: "Ditolak",
          className:
             "bg-red-50 text-destructive border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
       },
    },
   recon: {
      draft: {
         label: "Draft",
         className:
            "bg-muted text-muted-foreground border-border",
      },
      aktif: {
         label: "Aktif",
         className:
            "bg-green-50 text-brand-green border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
      },
      ditutup: {
         label: "Ditutup",
         className:
            "bg-primary/10 text-primary border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
      },
   },
   po: {
      menunggu: {
         label: "Menunggu",
         className:
            "bg-amber-50 text-accent border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
      },
      terverifikasi: {
         label: "Terverifikasi",
         className:
            "bg-green-50 text-brand-green border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
      },
      ditolak: {
         label: "Ditolak",
         className:
            "bg-red-50 text-destructive border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
      },
   },
    sync: {
       pending: {
          label: "Pending",
          className:
             "bg-amber-50 text-accent border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
       },
       running: {
          label: "Running",
          className:
             "bg-primary/10 text-primary border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
       },
       success: {
          label: "Success",
          className:
             "bg-green-50 text-brand-green border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
       },
       failed: {
          label: "Failed",
          className:
             "bg-red-50 text-destructive border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
       },
    },
    transaksi: {
       masuk: {
          label: "Masuk",
          className:
             "bg-amber-50 text-accent border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
       },
       keluar: {
          label: "Keluar",
          className:
             "bg-green-50 text-brand-green border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
       },
    },
    user: {
       aktif: {
          label: "Aktif",
          className:
             "bg-green-50 text-brand-green border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
       },
       nonaktif: {
          label: "Nonaktif",
          className:
             "bg-red-50 text-destructive border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
       },
    },
};

interface StatusBadgeProps {
   category: StatusCategory;
   value: string;
   label?: string;
   className?: string;
}

function StatusBadge({ category, value, label, className }: StatusBadgeProps) {
   const config = STATUS_MAP[category]?.[value];
   const displayLabel = label ?? config?.label ?? value;

   if (!config) {
      return (
         <Badge variant="outline" className={className}>
            {displayLabel}
         </Badge>
      );
   }

   return (
      <Badge
         variant="outline"
         className={cn(config.className, "border shadow-none", className)}
      >
         {displayLabel}
      </Badge>
   );
}

export { StatusBadge, STATUS_MAP };
export type { StatusCategory };
