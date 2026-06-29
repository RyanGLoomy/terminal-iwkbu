/**
 * Account helpers bersama untuk route handler manajemen akun.
 *
 * Sebelumnya `src/app/api/admin/petugas/route.ts` dan
 * `src/app/api/staf-iw/admin-terminal/route.ts` masing-masing mendefinisikan
 * ~70 baris helper yang nyaris identik (EMAIL_PATTERN, normalizeEmail/Text,
 * randomSuffix, generatePassword, validatePassword) — dengan drift kebijakan:
 * keduanya memakai PASSWORD_MIN_LENGTH = 8, sedangkan kanonik
 * `password-policy.ts` mensyaratkan 10 + kompleksitas. `reset-password` bahkan
 * hanya mengecek <6. Modul ini menyatukan normalize + validasi password ke
 * satu pemilik (leverage) dan menghapus duplikasi (locality).
 */
import { randomInt } from "crypto";
import {
   PASSWORD_MIN_LENGTH,
   validatePasswordStrength,
} from "@/lib/auth/password-policy";

export { PASSWORD_MIN_LENGTH };

/** Pola email sederhana untuk validasi manual di route handler. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown): string {
   return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeText(value: unknown): string {
   return typeof value === "string" ? value.trim() : "";
}

/** Suffix acak alfanumerik untuk password yang di-generate server. */
export function randomSuffix(length: number): string {
   const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
   let result = "";
   for (let i = 0; i < length; i += 1) {
      result += chars[randomInt(chars.length)];
   }
   return result;
}

/** Pesan syarat password yang konsisten lintas route. */
export const PASSWORD_POLICY_MESSAGE =
   "Password tidak memenuhi syarat: min 10 karakter, campuran huruf besar/kecil, angka, dan simbol.";

/**
 * Validasi password route handler — delegasi ke kebijakan kanonik
 * (PASSWORD_MIN_LENGTH + kompleksitas). Mengembalikan boolean agar call-site
 * tetap `if (!validateAccountPassword(x))`.
 */
export function validateAccountPassword(password: string): boolean {
   return validatePasswordStrength(password).ok;
}
