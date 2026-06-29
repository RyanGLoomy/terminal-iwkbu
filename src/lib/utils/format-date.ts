/**
 * Format tanggal/waktu terpusat (single owner).
 *
 * Semua memakai locale id-ID + timeZone Asia/Jakarta (WIB) agar output identik
 * di server (Node/Vercel, default UTC) dan client (browser, TZ lokal pengguna).
 * Tanpa timeZone tetap, `toLocaleString` menghasilkan string berbeda →
 * mismatch hydration React #418. Lihat skill react-expert (hydration).
 */

const LOCALE = "id-ID";
const TZ = "Asia/Jakarta";

/** "10 Jun 2026, 13.05" — tanggal medium + jam menit. */
export function formatDateTime(
   value: string | null | undefined,
): string {
   if (!value) return "-";
   return new Date(value).toLocaleString(LOCALE, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: TZ,
   });
}

/** "10 Jun 2026" — tanggal medium saja. */
export function formatDate(
   value: string | null | undefined,
): string {
   if (!value) return "-";
   return new Date(value).toLocaleDateString(LOCALE, {
      dateStyle: "medium",
      timeZone: TZ,
   });
}

/** "10 Jun 2026" dari tanggal-only (day 2-digit/month short/year numeric). */
export function formatDateShort(
   value: string | null | undefined,
): string {
   if (!value) return "-";
   return new Date(value).toLocaleDateString(LOCALE, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: TZ,
   });
}

/** Format kustom dengan opsi bebas — timeZone & locale tetap dipaksa. */
export function formatDateTimeCustom(
   value: string | null | undefined,
   opts: Intl.DateTimeFormatOptions,
): string {
   if (!value) return "-";
   return new Date(value).toLocaleString(LOCALE, { ...opts, timeZone: TZ });
}
