"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface VolumeData {
   date: string;
   masuk: number;
   keluar: number;
}

export function LoketVolumeChart({ data }: { data: VolumeData[] }) {
   if (!data || data.length === 0) {
      return (
         <div className="flex h-[200px] items-center justify-center rounded-xl border border-base-300 bg-base-100">
            <p className="text-sm text-base-content/50">Belum ada data transaksi minggu ini</p>
         </div>
      );
   }

   return (
      <div className="rounded-xl border border-base-300 bg-base-100 p-5">
         <h3 className="text-sm font-semibold text-base-content mb-4">
            Volume Transaksi (7 Hari Terakhir)
         </h3>
         <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data}>
               <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" />
               <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--color-base-content)" opacity={0.6} />
               <YAxis tick={{ fontSize: 12 }} stroke="var(--color-base-content)" opacity={0.6} />
               <Tooltip
                  contentStyle={{
                     backgroundColor: "var(--color-base-100)",
                     border: "1px solid var(--color-base-300)",
                     borderRadius: "8px",
                     fontSize: "13px",
                  }}
               />
               <Legend wrapperStyle={{ fontSize: "12px" }} />
               <Bar dataKey="masuk" fill="#3b82f6" name="Masuk" radius={[3, 3, 0, 0]} />
               <Bar dataKey="keluar" fill="#22c55e" name="Keluar" radius={[3, 3, 0, 0]} />
            </BarChart>
         </ResponsiveContainer>
      </div>
   );
}
