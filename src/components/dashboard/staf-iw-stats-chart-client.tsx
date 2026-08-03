"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

// Wrapper klien: memuat chart (recharts) hanya di browser (ssr:false)
// agar tidak dievaluasi saat SSR (HTML lebih kecil, no empty-placeholder flash).
const StafIWStatsChart = dynamic(
   () =>
      import("@/components/dashboard/staf-iw-stats-chart").then(
         (m) => m.StafIWStatsChart,
      ),
   {
      ssr: false,
      loading: () => (
         <div className="grid gap-5 lg:grid-cols-2">
            <div className="h-[300px] rounded-xl bg-base-200/50" />
            <div className="h-[300px] rounded-xl bg-base-200/50" />
         </div>
      ),
   },
);

export function StafIWStatsChartClient(
   props: ComponentProps<typeof StafIWStatsChart>,
) {
   return <StafIWStatsChart {...props} />;
}
