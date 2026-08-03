"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const PoComplianceChart = dynamic(
   () =>
      import("@/components/dashboard/po-compliance-chart").then(
         (m) => m.PoComplianceChart,
      ),
   {
      ssr: false,
      loading: () => (
         <div className="h-[280px] rounded-xl bg-base-200/50" />
      ),
   },
);

export function PoComplianceChartClient(
   props: ComponentProps<typeof PoComplianceChart>,
) {
   return <PoComplianceChart {...props} />;
}
