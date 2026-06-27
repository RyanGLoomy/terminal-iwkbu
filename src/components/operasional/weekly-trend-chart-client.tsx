"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

// Wrapper klien: muat recharts hanya di browser (ssr:false).
const WeeklyTrendChart = dynamic(
   () =>
      import("@/components/operasional/weekly-trend-chart").then(
         (m) => m.WeeklyTrendChart,
      ),
   {
      ssr: false,
      loading: () => <div className="skeleton h-[300px] rounded-xl" />,
   },
);

export function WeeklyTrendChartClient(
   props: ComponentProps<typeof WeeklyTrendChart>,
) {
   return <WeeklyTrendChart {...props} />;
}
