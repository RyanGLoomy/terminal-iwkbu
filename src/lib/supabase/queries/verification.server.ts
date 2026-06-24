import { createClient } from "@/lib/supabase/server";
import type { Armada, PO } from "@/lib/supabase/queries/verification.types";

// ============================================================
// READ ARMADA (STAF IW / ADMIN)
// ============================================================

export async function getAllArmada(filters?: {
   status_verifikasi?: string;
   po_id?: string;
   search?: string;
   limit?: number;
}) {
   const supabase = await createClient();

   let query = supabase
      .from("armada")
      .select("*, po:po_id(kode_po, nama_perusahaan)")
      .order("created_at", { ascending: false })
      .limit(filters?.limit ?? 5000); // Default 5000, can be overridden

   if (filters?.status_verifikasi) {
      query = query.eq("status_verifikasi", filters.status_verifikasi);
   }
   if (filters?.po_id) {
      query = query.eq("po_id", filters.po_id);
   }
   if (filters?.search) {
      query = query.or(
         `nomor_polisi.ilike.%${filters.search}%,nomor_lambung.ilike.%${filters.search}%`,
      );
   }

   const { data, error } = await query;
   if (error) throw error;
   return data as Armada[];
}

export const getArmadaForAdmin = getAllArmada;

// ============================================================
// LIST PO UNTUK STAF IW (dengan filter status)
// ============================================================

export async function getAllPO(status?: "menunggu" | "aktif" | "ditolak") {
   const supabase = await createClient();

   let query = supabase
      .from("po")
      .select("*, profiles!po_id_fkey(email, full_name)")
      .order("created_at", { ascending: false });

   if (status) {
      query = query.eq("status_verifikasi", status);
   }

   const { data, error } = await query;
   if (error) throw error;
   return data as PO[];
}
