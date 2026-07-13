export const FINDINGS_PAGE_SIZE = 15;

export function formatDecisionLabel(decision: string) {
   if (decision === "menerima") return "Menerima";
   if (decision === "menolak") return "Menolak";
   if (decision === "melengkapi") return "Melengkapi Bukti";
   return decision;
}

export function isOverdue(dueDate: string | null, status: string) {
   if (!dueDate || status === "closed") return false;
   return new Date(dueDate) < new Date(new Date().toDateString());
}

export function getDueDateBadge(
   dueDate: string | null,
   status: string,
): { label: string; color: string } | null {
   if (!dueDate || status === "closed") return null;
   const due = new Date(dueDate + "T00:00:00");
   const today = new Date(new Date().toDateString());
   const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
   if (diffDays < 0) return { label: `Terlambat ${Math.abs(diffDays)} hari`, color: "bg-red-100 text-error border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800" };
   if (diffDays === 0) return { label: "Jatuh tempo hari ini", color: "bg-red-100 text-error border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800" };
   if (diffDays === 1) return { label: "Jatuh tempo besok", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800" };
   if (diffDays <= 3) return { label: `${diffDays} hari lagi`, color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800" };
   return null;
}

export { formatDateTime } from "@/lib/utils/format-date";
