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

export function formatDateTime(value: string | null) {
   if (!value) return "-";
   return new Date(value).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
   });
}
