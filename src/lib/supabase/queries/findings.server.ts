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
   periode_id,
   po:po_id(kode_po, nama_perusahaan),
   armada:armada_id(nomor_polisi, nomor_lambung, status_verifikasi, status_operasional),
   finding_clarifications(id, finding_id, responder_id, responder_role, decision, message, evidence, created_at),
   finding_actions(id, finding_id, action_text, status, done_at, done_by, created_by, created_at)
`;

export async function getStaffFindings(limit = 5000) {
   const supabase = await createClient();
   const { data, error } = await supabase
      .from("findings")
      .select(FINDING_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);

   if (error) throw error;
   return (data ?? []) as unknown as FindingRecord[];
}

export async function getPoFindings(poId: string, limit = 5000) {
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

/**
 * Ambil satu finding beserta relasinya (klarifikasi, tindak lanjut, po, armada).
 * RLS berlaku: Staf IW bisa membaca semua, PO hanya miliknya. Untuk gate
 * eksplisit di sisi PO, caller dapat menambahkan filter poId (opsional).
 * Mengembalikan null bila tidak ada / tidak berhak.
 */
export async function getFindingById(id: string, poId?: string) {
   const supabase = await createClient();
   let query = supabase.from("findings").select(FINDING_SELECT).eq("id", id);
   if (poId) query = query.eq("po_id", poId);
   const { data, error } = await query.maybeSingle();
   if (error) throw error;
   return (data ?? null) as unknown as FindingRecord | null;
}
