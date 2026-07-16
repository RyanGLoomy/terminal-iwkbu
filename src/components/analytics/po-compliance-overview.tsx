"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PoCompliance {
   kode_po: string;
   nama_perusahaan: string;
   ready: number;
   needs_review: number;
   blocked: number;
   total: number;
}

export function PoComplianceOverview({ data }: { data: PoCompliance[] }) {
   if (!data || data.length === 0) {
      return (
         <div className="flex h-[280px] items-center justify-center rounded-xl border border-base-300 bg-base-100">
            <p className="text-sm text-base-content/50">Belum ada data compliance PO</p>
         </div>
      );
   }

   const chartData = data.map((d) => ({
      name: d.kode_po,
      Patuh: d.ready,
      Tinjauan: d.needs_review,
      Diblokir: d.blocked,
   }));

   return (
      <div className="rounded-xl border border-base-300 bg-base-100 p-5">
         <h3 className="text-sm font-semibold text-base-content mb-4">
            Compliance Overview per PO
         </h3>
         <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
               <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" />
               <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--color-base-content)" opacity={0.6} />
               <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-base-content)" opacity={0.6} width={70} />
               <Tooltip
                  contentStyle={{
                     backgroundColor: "var(--color-base-100)",
                     border: "1px solid var(--color-base-300)",
                     borderRadius: "8px",
                     fontSize: "13px",
                  }}
               />
               <Legend wrapperStyle={{ fontSize: "13px" }} />
               <Bar dataKey="Patuh" stackId="a" fill="#22c55e" />
               <Bar dataKey="Tinjauan" stackId="a" fill="#f59e0b" />
               <Bar dataKey="Diblokir" stackId="a" fill="#ef4444" />
            </BarChart>
         </ResponsiveContainer>
      </div>
   );
}
