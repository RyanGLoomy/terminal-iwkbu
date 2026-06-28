import * as z from "zod";

/**
 * Password policy & leaked-password check (AUTH-02 mitigation).
 *
 * Supabase Auth's built-in "Leaked Password Protection" (HaveIBeenPwned) is a
 * Pro-plan-only, server-side feature. As a mitigation on plans where it is not
 * available, we (a) enforce a strong complexity policy and (b) query the HIBP
 * Pwned Passwords API using the k-anonymity model — only the first 5 hex chars
 * of the password's SHA-1 leave the device. The SHA-1 here is used solely for
 * the HIBP lookup protocol; passwords are stored by Supabase Auth using bcrypt.
 *
 * Caveat: client-side checks are UX / defense-in-depth and can be bypassed by a
 * determined attacker calling supabase.auth.signUp directly. For authoritative
 * enforcement, enable Supabase Auth's server-side Leaked Password Protection
 * (Pro plan) and raise the Auth min password length in the Dashboard.
 */

export const PASSWORD_MIN_LENGTH = 10;

export const PASSWORD_REQUIREMENTS: Array<{ label: string; test: (v: string) => boolean }> = [
   { label: `Minimal ${PASSWORD_MIN_LENGTH} karakter`, test: (v) => v.length >= PASSWORD_MIN_LENGTH },
   { label: "Huruf besar (A–Z)", test: (v) => /[A-Z]/.test(v) },
   { label: "Huruf kecil (a–z)", test: (v) => /[a-z]/.test(v) },
   { label: "Angka (0–9)", test: (v) => /[0-9]/.test(v) },
   { label: "Simbol (!@#$…)", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

/** Zod schema for form validation (use in react-hook-form via zodResolver). */
export const passwordSchema = z
   .string()
   .min(PASSWORD_MIN_LENGTH, `Password minimal ${PASSWORD_MIN_LENGTH} karakter`)
   .refine((v) => /[a-z]/.test(v), "Wajib memuat huruf kecil")
   .refine((v) => /[A-Z]/.test(v), "Wajib memuat huruf besar")
   .refine((v) => /[0-9]/.test(v), "Wajib memuat angka")
   .refine((v) => /[^A-Za-z0-9]/.test(v), "Wajib memuat simbol");

/** Imperative strength check for server-side route handlers. */
export function validatePasswordStrength(
   password: string,
): { ok: true } | { ok: false; message: string } {
   for (const req of PASSWORD_REQUIREMENTS) {
      if (!req.test(password)) {
         return { ok: false, message: `Password tidak memenuhi syarat: ${req.label}.` };
      }
   }
   return { ok: true };
}

async function sha1Hex(input: string): Promise<string> {
   const data = new TextEncoder().encode(input);
   const buf = await crypto.subtle.digest("SHA-1", data);
   return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
}

/**
 * Query the HaveIBeenPwned Pwned Passwords API (k-anonymity: only the first 5
 * hex chars of the SHA-1 are sent). Returns the breach count for the password
 * (0 = not found in the leak dataset).
 *
 * Fail-open: returns 0 on network/parse error so an HIBP outage does not block
 * legitimate registration. The strong-policy check still applies regardless.
 */
export async function getPasswordBreachCount(password: string): Promise<number> {
   try {
      const hash = await sha1Hex(password);
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
         cache: "no-store",
      });
      if (!res.ok) return 0;
      const text = await res.text();
      const line = text.split("\n").find((l) => l.startsWith(suffix));
      if (!line) return 0;
      const count = Number(line.split(":")[1]);
      return Number.isFinite(count) ? count : 0;
   } catch {
      return 0;
   }
}

export async function isPasswordLeaked(password: string): Promise<boolean> {
   return (await getPasswordBreachCount(password)) > 0;
}
