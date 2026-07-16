import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import type { Armada, PO } from "@/lib/supabase/queries/verification.types";

// ============================================================
// READ ARMADA — React cache() untuk per-request dedup
// ============================================================

async function getAllArmadaRaw(filters?: {
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
      .limit(filters?.limit ?? 5000);

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

/** Get all armada with per-request dedup (React cache) */
export const getAllArmada = cache(getAllArmadaRaw);

// ============================================================
// LIST PO — React cache() untuk per-request dedup + Next.js cache untuk stats
// ============================================================

async function getAllPORaw(status?: "menunggu" | "aktif" | "ditolak") {
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

/**
 * Get all PO with per-request dedup (React cache).
 * Use this in Server Components that need fresh data.
 */
export const getAllPO = cache(getAllPORaw);

/**
 * Cached version for dashboard stat counts.
 * Revalidate: 60 seconds. Tag: "po-stats".
 * Invalidate with: revalidateTag("po-stats")
 */
export const getCachedPOCounts = unstable_cache(
   async () => {
      const supabase = await createClient();
      const [menunggu, aktif, ditolak] = await Promise.all([
         supabase.from("po").select("id", { count: "exact", head: true }).eq("status_verifikasi", "menunggu"),
         supabase.from("po").select("id", { count: "exact", head: true }).eq("status_verifikasi", "aktif"),
         supabase.from("po").select("id", { count: "exact", head: true }).eq("status_verifikasi", "ditolak"),
      ]);
      return {
         menunggu: menunggu.count ?? 0,
         aktif: aktif.count ?? 0,
         ditolak: ditolak.count ?? 0,
      };
   },
   ["po-stats-cache"],
   { tags: ["po-stats"], revalidate: 60 },
);

/**
 * Cached armada counts for dashboard.
 * Revalidate: 60 seconds. Tag: "armada-stats".
 */
export const getCachedArmadaCounts = unstable_cache(
   async () => {
      const supabase = await createClient();
      const [menunggu, terverifikasi, ditolak] = await Promise.all([
         supabase.from("armada").select("id", { count: "exact", head: true }).eq("status_verifikasi", "menunggu"),
         supabase.from("armada").select("id", { count: "exact", head: true }).eq("status_verifikasi", "terverifikasi"),
         supabase.from("armada").select("id", { count: "exact", head: true }).eq("status_verifikasi", "ditolak"),
      ]);
      return {
         menunggu: menunggu.count ?? 0,
         terverifikasi: terverifikasi.count ?? 0,
         ditolak: ditolak.count ?? 0,
      };
   },
   ["armada-stats-cache"],
   { tags: ["armada-stats"], revalidate: 60 },
);
