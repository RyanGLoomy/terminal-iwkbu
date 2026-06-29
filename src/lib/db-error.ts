/**
 * Sanitize database/internal errors before returning to client.
 *
 * Raw Postgres/Supabase error messages can leak schema names,
 * constraint names, column names, and RPC signatures — useful to
 * an attacker mapping the database. This helper logs the full error
 * server-side and returns a generic user-facing message.
 *
 * Usage:
 *   return NextResponse.json(
 *     { message: sanitizeDbError(error) },
 *     { status: 500 },
 *   );
 */
export function sanitizeDbError(error: unknown, context?: string): string {
  let raw: string;
  if (error instanceof Error) {
    raw = error.message;
  } else if (typeof error === "string") {
    raw = error;
  } else if (error && typeof error === "object" && "message" in error) {
    // PostgREST/GoTrace errors are plain objects { message, code, ... }, not Error instances.
    const m = (error as { message?: unknown }).message;
    raw = typeof m === "string" ? m : "Unknown error";
  } else {
    raw = "Unknown error";
  }

  // Log full error server-side for debugging (never sent to client)
  console.error(
    `[DB Error${context ? ` · ${context}` : ""}] ${raw}`,
    error instanceof Error && error.cause ? error.cause : "",
  );

  // In development, return the raw message for faster debugging
  if (process.env.NODE_ENV !== "production") {
    return raw;
  }

  // In production, return generic message
  return "Terjadi kesalahan pada server. Silakan coba lagi.";
}

/**
 * Safely extract a human-readable message from an unknown caught value
 * (for `catch (error: unknown)` blocks). Never throws.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "Unknown error";
}
