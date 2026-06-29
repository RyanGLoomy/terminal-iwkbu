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

export { formatDateTime } from "@/lib/utils/format-date";
