"use client";

import {
   PieChart,
   Pie,
   Cell,
   Tooltip,
   ResponsiveContainer,
   Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChartIcon, CheckCircle2 } from "lucide-react";

interface StafIWStatsChartProps {
   poMenunggu: number;
   poAktif: number;
   armadaMenunggu: number;
   armadaTerverifikasi: number;
   armadaDitolak: number;
}

const COLORS_PO = {
   menunggu: "#f59e0b",
   aktif: "#10b981",
};

const COLORS_ARMADA = {
   menunggu: "#f59e0b",
   terverifikasi: "#10b981",
   ditolak: "#ef4444",
};

export function StafIWStatsChart({
   poMenunggu,
   poAktif,
   armadaMenunggu,
   armadaTerverifikasi,
   armadaDitolak,
}: StafIWStatsChartProps) {
   const poData = [
      { name: "Menunggu", value: poMenunggu, fill: COLORS_PO.menunggu },
      { name: "Aktif", value: poAktif, fill: COLORS_PO.aktif },
   ].filter((d) => d.value > 0);

   const armadaData = [
      { name: "Menunggu", value: armadaMenunggu, fill: COLORS_ARMADA.menunggu },
      {
         name: "Terverifikasi",
         value: armadaTerverifikasi,
         fill: COLORS_ARMADA.terverifikasi,
      },
      { name: "Ditolak", value: armadaDitolak, fill: COLORS_ARMADA.ditolak },
   ].filter((d) => d.value > 0);

   const totalPO = poMenunggu + poAktif;
   const totalArmada =
      armadaMenunggu + armadaTerverifikasi + armadaDitolak;
   const verifyRate = totalArmada > 0
      ? Math.round((armadaTerverifikasi / totalArmada) * 100)
      : 0;

   return (
      <div className="grid gap-5 lg:grid-cols-2">
         <Card className="border-border">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <PieChartIcon className="h-4 w-4 text-brand-sky" />
                  Distribusi Status PO
               </CardTitle>
            </CardHeader>
            <CardContent>
               {totalPO === 0 ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                     Belum ada data PO.
                  </div>
               ) : (
                  <ResponsiveContainer width="100%" height={240}>
                     <PieChart>
                        <Pie
                           data={poData}
                           dataKey="value"
                           nameKey="name"
                           cx="50%"
                           cy="50%"
                           innerRadius={55}
                           outerRadius={85}
                           paddingAngle={3}
                        >
                           {poData.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                           ))}
                        </Pie>
                        <Tooltip
                           contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                              fontSize: "13px",
                           }}
                        />
                        <Legend
                           iconType="circle"
                           wrapperStyle={{ fontSize: "12px" }}
                        />
                     </PieChart>
                  </ResponsiveContainer>
               )}
            </CardContent>
         </Card>

         <Card className="border-border">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-brand-green" />
                  Status Verifikasi Armada
                  {totalArmada > 0 && (
                     <span className="ml-auto text-xs font-semibold text-brand-green">
                        {verifyRate}% Terverifikasi
                     </span>
                  )}
               </CardTitle>
            </CardHeader>
            <CardContent>
               {totalArmada === 0 ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                     Belum ada data armada.
                  </div>
               ) : (
                  <ResponsiveContainer width="100%" height={240}>
                     <PieChart>
                        <Pie
                           data={armadaData}
                           dataKey="value"
                           nameKey="name"
                           cx="50%"
                           cy="50%"
                           innerRadius={55}
                           outerRadius={85}
                           paddingAngle={3}
                        >
                           {armadaData.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                           ))}
                        </Pie>
                        <Tooltip
                           contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                              fontSize: "13px",
                           }}
                        />
                        <Legend
                           iconType="circle"
                           wrapperStyle={{ fontSize: "12px" }}
                        />
                     </PieChart>
                  </ResponsiveContainer>
               )}
            </CardContent>
         </Card>
      </div>
   );
}
