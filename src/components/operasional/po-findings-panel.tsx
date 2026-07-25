"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import type { FindingRecord } from "@/lib/supabase/queries/operasional.types";
import { FINDINGS_PAGE_SIZE } from "./findings-shared";
import { FindingsPagination } from "./findings-pagination";
import { FindingListItem } from "./finding-list-item";

export function PoFindingsPanel({ findings }: { findings: FindingRecord[] }) {
   const router = useRouter();
   const searchParams = useSearchParams();
   const highlightId = searchParams.get("highlight");
   const [search, setSearch] = useState("");
   const deferredSearch = useDeferredValue(search);
   const [statusFilter, setStatusFilter] = useState("semua");
   const [page, setPage] = useState(1);

   const filteredFindings = (() => {
      let result = findings;
      if (statusFilter !== "semua") {
         result = result.filter((f) => f.status === statusFilter);
      }
      if (!deferredSearch.trim()) return result;
      const q = deferredSearch.trim().toLowerCase();
      return result.filter(
         (f) =>
            f.judul.toLowerCase().includes(q) ||
            f.nomor_polisi.toLowerCase().includes(q) ||
            (f.deskripsi ?? "").toLowerCase().includes(q),
      );
   })();

   const pageCount = Math.max(1, Math.ceil(filteredFindings.length / FINDINGS_PAGE_SIZE));
   const safePage = Math.min(page, pageCount);
   const pagedFindings = filteredFindings.slice(
      (safePage - 1) * FINDINGS_PAGE_SIZE,
      safePage * FINDINGS_PAGE_SIZE,
   );

   const openCount = findings.filter((i) => i.status === "open").length;
   const progressCount = findings.filter((i) => i.status === "on_progress").length;
   const closedCount = findings.filter((i) => i.status === "closed").length;

   // Live findings via Realtime (debounced router.refresh)
   useEffect(() => {
      const supabase = createClient();
      let pending = false;
      const channel = supabase
         .channel(`findings-po:${crypto.randomUUID()}`)
         .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "findings" },
            () => {
               if (pending) return;
               pending = true;
               setTimeout(() => {
                  router.refresh();
                  pending = false;
               }, 2000);
            },
         )
         .subscribe();
      return () => supabase.removeChannel(channel);
   }, [router]);

   // Highlight dari ?highlight=<id>: reset filter + lompat ke halaman target.
   const [glowKey, setGlowKey] = useState(0);
   useEffect(() => {
      if (!highlightId) return;
      const idx = findings.findIndex((f) => f.id === highlightId);
      if (idx === -1) return;
      setSearch("");
      setStatusFilter("semua");
      setPage(Math.floor(idx / FINDINGS_PAGE_SIZE) + 1);
      setGlowKey((k) => k + 1);
      const timer = setTimeout(() => {
         const el = document.querySelector("[data-highlight-id]");
         if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [highlightId]);

   return (
      <div className="space-y-5">
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard title="Total Temuan" value={String(findings.length)} description="Untuk armada PO ini" icon="alert-triangle" accent="blue" index={0} />
            <DashboardCard title="Open" value={String(openCount)} description="Menunggu jawaban" icon="clock" accent="amber" index={1} />
            <DashboardCard title="On Progress" value={String(progressCount)} description="Sudah ada tindak lanjut" icon="activity" accent="violet" index={2} />
            <DashboardCard title="Closed" value={String(closedCount)} description="Sudah diselesaikan" icon="check-circle" accent="green" index={3} />
         </div>

         {/* Toolbar */}
         <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-base-content/70">
               {filteredFindings.length}
               {filteredFindings.length !== findings.length && ` dari ${findings.length}`} temuan
            </span>
            <div className="flex flex-col gap-2 sm:flex-row">
               <Input
                  placeholder="Cari temuan..."
                  value={search}
                  onChange={(e) => {
                     setSearch(e.target.value);
                     setPage(1);
                  }}
                  className="h-8 w-full text-sm sm:w-56"
               />
               <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="h-8 w-full text-sm sm:w-32">
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="semua">Semua</SelectItem>
                     <SelectItem value="open">Open</SelectItem>
                     <SelectItem value="on_progress">On Progress</SelectItem>
                     <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
               </Select>
            </div>
         </div>

         {/* List */}
         {filteredFindings.length === 0 ? (
            <Card>
               <CardContent className="py-8 text-center text-sm text-base-content/70">
                  {findings.length === 0 ? "Belum ada temuan untuk PO ini." : "Tidak ada temuan yang cocok dengan pencarian."}
               </CardContent>
            </Card>
         ) : (
            <div className="space-y-2.5">
               {pagedFindings.map((finding) => (
                  <FindingListItem
                     key={`${finding.id}-${highlightId === finding.id ? glowKey : 0}`}
                     finding={finding}
                     href={`/po/temuan/${finding.id}`}
                     highlight={highlightId === finding.id}
                  />
               ))}
            </div>
         )}

         <FindingsPagination
            page={safePage}
            pageCount={pageCount}
            total={filteredFindings.length}
            pageSize={FINDINGS_PAGE_SIZE}
            onPageChange={setPage}
         />
      </div>
   );
}
