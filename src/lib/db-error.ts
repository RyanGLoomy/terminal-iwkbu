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
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown error";

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
