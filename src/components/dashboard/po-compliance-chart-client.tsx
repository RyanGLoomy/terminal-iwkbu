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
         <div className="skeleton h-[280px] rounded-xl" />
      ),
   },
);

export function PoComplianceChartClient(
   props: ComponentProps<typeof PoComplianceChart>,
) {
   return <PoComplianceChart {...props} />;
}
