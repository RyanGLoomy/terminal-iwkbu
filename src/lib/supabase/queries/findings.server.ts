import { createClient } from "@/lib/supabase/server";
import type { FindingRecord } from "./operasional.types";

const FINDING_SELECT = `
   id,
   po_id,
   armada_id,
   nomor_polisi,
   source_type,
   judul,
   deskripsi,
   severity,
   status,
   source_date,
   due_date,
   created_by,
   resolved_by,
   resolved_at,
   resolution_note,
   created_at,
   updated_at,
   po:po_id(kode_po, nama_perusahaan),
   armada:armada_id(nomor_polisi, nomor_lambung, status_verifikasi, status_operasional),
   finding_clarifications(id, finding_id, responder_id, responder_role, decision, message, evidence, created_at),
   finding_actions(id, finding_id, action_text, status, done_at, done_by, created_by, created_at)
`;

export async function getStaffFindings(limit = 100) {
   const supabase = await createClient();
   const { data, error } = await supabase
      .from("findings")
      .select(FINDING_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);

   if (error) throw error;
   return (data ?? []) as unknown as FindingRecord[];
}

export async function getPoFindings(poId: string, limit = 100) {
   const supabase = await createClient();
   const { data, error } = await supabase
      .from("findings")
      .select(FINDING_SELECT)
      .eq("po_id", poId)
      .order("created_at", { ascending: false })
      .limit(limit);

   if (error) throw error;
   return (data ?? []) as unknown as FindingRecord[];
}
