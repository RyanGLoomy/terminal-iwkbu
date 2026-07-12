import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeDbError } from "@/lib/db-error";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import { createNotification } from "@/lib/supabase/queries/notifications.server";
import type { AuthenticatedActor } from "@/lib/auth/server-actor";

/**
 * Modul lifecycle Temuan (deepened).
 *
 * Dua lapis:
 *   - `nextStatus({from, event, decision?})` : PURE tabel transisi (testable).
 *   - `submitClarification(...)`              : helper yang menggabungkan body
 *     duplikat 2 route klarifikasi (po & staf-iw): upload bukti + insert
 *     clarification + update status (via nextStatus) + log + notify.
 *
 * Aturan transisi (permissive — pertahankan perilaku sebelumnya):
 *   po_clarify   dari open/on_progress -> decision "menolak" ? open : on_progress
 *   staf_clarify dari open/on_progress -> on_progress
 *   *_clarify    dari closed           -> null (invalid -> route 409)
 *   staf_close   -> closed ; staf_reopen -> open
 */

export type FindingStatus = "open" | "on_progress" | "closed";
export type FindingEvent =
   | "po_clarify"
   | "staf_clarify"
   | "staf_close"
   | "staf_reopen";
export type ClarificationDecision = "menerima" | "menolak" | "melengkapi";
export type ClarificationResponder = "po" | "staf-iw";

export class FindingClosedError extends Error {
   status = 409;
   constructor(message = "Temuan sudah ditutup") {
      super(message);
      this.name = "FindingClosedError";
   }
}

export class InvalidClarificationError extends Error {
   status = 400;
   constructor(message: string) {
      super(message);
      this.name = "InvalidClarificationError";
   }
}

/** PURE: status berikutnya dari transisi, atau null bila invalid. */
export function nextStatus(input: {
   from: FindingStatus;
   event: FindingEvent;
   decision?: ClarificationDecision;
}): FindingStatus | null {
   const { from, event, decision } = input;

   if (event === "po_clarify" || event === "staf_clarify") {
      if (from === "closed") return null;
      if (event === "po_clarify") {
         return decision === "menolak" ? "open" : "on_progress";
      }
      return "on_progress";
   }

   if (event === "staf_close") return "closed";
   if (event === "staf_reopen") return "open";

   return null;
}

export const ALLOWED_EVIDENCE_MIME = [
   "application/pdf",
   "image/jpeg",
   "image/png",
   "image/webp",
];
export const MAX_EVIDENCE_FILE_SIZE = 5 * 1024 * 1024;

// Link bukti hanya boleh http/https — blok stored-XSS via `javascript:` (APP-02).
function isSafeEvidenceUrl(raw: string): boolean {
   try {
      const u = new URL(raw);
      return u.protocol === "http:" || u.protocol === "https:";
   } catch {
      return false;
   }
}

export interface FindingForClarification {
   id: string;
   po_id: string;
   status: string;
   created_by: string | null;
   judul: string;
   nomor_polisi: string;
}

export interface ClarificationRecord {
   id: string;
   finding_id: string;
   responder_id: string;
   responder_role: string;
   decision: ClarificationDecision;
   message: string;
   evidence: Record<string, unknown>;
   created_at: string;
}

/**
 * Eksekusi klarifikasi (dipakai route PO & Staf IW). Membungkus body duplikat:
 * validasi+upload bukti, insert clarification, update status via nextStatus,
 * log aktivitas, dan notifikasi ke lawan (pembuat temuan / PO).
 *
 * Throw:
 *   - FindingClosedError (409) bila temuan sudah closed.
 *   - InvalidClarificationError (400) bila MIME/ukuran file tak valid, atau
 *     link bukti bukan http/https.
 */
export async function submitClarification(params: {
   actor: AuthenticatedActor;
   responder: ClarificationResponder;
   finding: FindingForClarification;
   decision: ClarificationDecision;
   message: string;
   evidenceLink?: string;
   evidenceFile?: File | null;
}): Promise<{ clarification: ClarificationRecord; newStatus: FindingStatus | null }> {
   const { actor, responder, finding, decision, message, evidenceLink, evidenceFile } =
      params;

   const event: FindingEvent =
      responder === "po" ? "po_clarify" : "staf_clarify";
   const newStatus = nextStatus({
      from: finding.status as FindingStatus,
      event,
      decision,
   });
   if (newStatus === null) {
      throw new FindingClosedError();
   }

   const admin = createAdminClient();
    const evidence: Record<string, unknown> = {};
    if (evidenceLink) {
       if (!isSafeEvidenceUrl(evidenceLink)) {
          throw new InvalidClarificationError(
             "Link bukti tidak valid (hanya http/https).",
          );
       }
       evidence.link = evidenceLink;
    }

   if (evidenceFile && evidenceFile.size > 0) {
      if (!ALLOWED_EVIDENCE_MIME.includes(evidenceFile.type)) {
         throw new InvalidClarificationError(
            "Format file tidak didukung. Gunakan PDF, JPEG, PNG, atau WebP.",
         );
      }
      if (evidenceFile.size > MAX_EVIDENCE_FILE_SIZE) {
         throw new InvalidClarificationError("Ukuran file melebihi batas 5 MB");
      }

      // APP-03: sanitize filename before interpolation into the storage key
      // (File.name is fully client-controlled; a name containing '/' or '..'
      // would nest/escape the finding's folder). Keep the original for display.
      const safeName = evidenceFile.name
         .replace(/[^a-zA-Z0-9._-]/g, "_")
         .slice(0, 100);
      const filePath = `${finding.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await admin.storage
         .from("finding-evidence")
         .upload(filePath, evidenceFile, {
            contentType: evidenceFile.type,
            upsert: false,
         });

      if (uploadError) {
         throw new Error(
            `Gagal mengunggah file: ${sanitizeDbError(uploadError, "clarification upload")}`,
         );
      }

      evidence.file_path = filePath;
      evidence.file_name = evidenceFile.name;
   }

   const { data, error } = await admin
      .from("finding_clarifications")
      .insert({
         finding_id: finding.id,
         responder_id: actor.user.id,
         responder_role: responder === "po" ? "po" : "staf-iw",
         decision,
         message,
         evidence,
      })
      .select(
         "id, finding_id, responder_id, responder_role, decision, message, evidence, created_at",
      )
      .single();

   if (error) {
      throw new Error(sanitizeDbError(error, "clarification insert"));
   }

   const { error: statusError } = await admin
      .from("findings")
      .update({ status: newStatus })
      .eq("id", finding.id)
      .eq(responder === "po" ? "po_id" : "id", responder === "po" ? finding.po_id : finding.id);

   if (statusError) {
      console.error(
         "Failed to auto-update finding status after clarification:",
         statusError.message,
      );
   }

   await logActivity(
      "KIRIM_KLARIFIKASI",
      "Mengirim klarifikasi temuan",
      {
         finding_id: finding.id,
         clarification_id: data.id,
         po_id: finding.po_id,
         decision,
         responder_role: responder === "po" ? "po" : "staf-iw",
         has_evidence_link: Boolean(evidenceLink),
         has_evidence_file: Boolean(evidenceFile),
      },
      { actorUserId: actor.user.id },
   );

   // Notifikasi ke lawan: PO -> pembuat temuan (staf-iw); staf-iw -> PO pemilik.
   if (responder === "po") {
      if (finding.created_by) {
         await createNotification({
            userId: finding.created_by,
            title: "PO Mengirim Klarifikasi",
            message: `PO merespon temuan "${finding.judul}" (${decision})`,
            type: "info",
            link: "/staf-iw/temuan",
         });
      }
   } else {
      if (finding.po_id) {
         await createNotification({
            userId: finding.po_id,
            title: "Staf IW Mengirim Klarifikasi",
            message: `Staf IW merespon temuan "${finding.judul}" (${decision})`,
            type: "info",
            link: "/po/temuan",
         });
      }
   }

   return {
      clarification: data as unknown as ClarificationRecord,
      newStatus,
   };
}
