"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface FindingsPaginationProps {
   page: number;
   pageCount: number;
   total: number;
   pageSize: number;
   onPageChange: (page: number) => void;
}

/**
 * Build a compact list of page numbers with ellipsis, e.g. for 10 pages:
 *   page 1  -> [1, 2, 3, "...", 10]
 *   page 5  -> [1, "...", 4, 5, 6, "...", 10]
 *   page 10 -> [1, "...", 8, 9, 10]
 */
function buildPageItems(page: number, pageCount: number): (number | "...")[] {
   if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
   }
   const items: (number | "...")[] = [1];
   const start = Math.max(2, page - 1);
   const end = Math.min(pageCount - 1, page + 1);
   if (start > 2) items.push("...");
   for (let p = start; p <= end; p++) items.push(p);
   if (end < pageCount - 1) items.push("...");
   items.push(pageCount);
   return items;
}

export function FindingsPagination({
   page,
   pageCount,
   total,
   pageSize,
   onPageChange,
}: FindingsPaginationProps) {
   if (total === 0) return null;

   const pageItems = buildPageItems(page, pageCount);
   const from = (page - 1) * pageSize + 1;
   const to = Math.min(total, page * pageSize);

   return (
      <div className="flex flex-col items-center justify-between gap-3 pt-3 sm:flex-row">
         <p className="text-xs text-base-content/60">
            Menampilkan {from}–{to} dari {total} temuan
            {pageCount > 1 && ` · halaman ${page} dari ${pageCount}`}
         </p>
         {pageCount > 1 && (
            <div className="flex items-center gap-1">
               <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onPageChange(1)}
                  disabled={page === 1}
                  aria-label="Halaman pertama"
               >
                  <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
               </Button>
               <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  aria-label="Halaman sebelumnya"
               >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
               </Button>
               {pageItems.map((item, idx) =>
                  item === "..." ? (
                     <span
                        key={`ellipsis-${idx}`}
                        className="px-1 text-xs text-base-content/50"
                        aria-hidden="true"
                     >
                        …
                     </span>
                  ) : (
                     <Button
                        key={item}
                        variant={item === page ? "default" : "outline"}
                        size="sm"
                        className="h-8 min-w-8 px-2"
                        onClick={() => onPageChange(item)}
                        aria-current={item === page ? "page" : undefined}
                     >
                        {item}
                     </Button>
                  ),
               )}
               <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page === pageCount}
                  aria-label="Halaman berikutnya"
               >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
               </Button>
               <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onPageChange(pageCount)}
                  disabled={page === pageCount}
                  aria-label="Halaman terakhir"
               >
                  <ChevronsRight className="h-4 w-4" aria-hidden="true" />
               </Button>
            </div>
         )}
      </div>
   );
}
