/**
 * Revalidate periods (seconds) for different cache categories.
 * Tuned for the IWKBU Terminal app's data characteristics.
 */
export const REVALIDATE = {
   /** Master data: terminals, jenis_kendaraan, settings — rarely changes */
   MASTER_DATA: 300, // 5 minutes
   /** Dashboard stat counts — can be slightly stale */
   STATS: 60, // 1 minute
   /** Analytics data (heatmap, trends) — historical, not real-time */
   ANALYTICS: 300, // 5 minutes
   /** Laporan / reports — generated from historical data */
   REPORTS: 300, // 5 minutes
} as const;

export type RevalidatePeriod = (typeof REVALIDATE)[keyof typeof REVALIDATE];

/** Cache tags for tag-based invalidation */
export const CACHE_TAGS = {
   MASTER_DATA: "master-data",
   PO_STATS: "po-stats",
   ARMADA_STATS: "armada-stats",
   ANALYTICS: "analytics",
   REPORTS: "reports",
} as const;
