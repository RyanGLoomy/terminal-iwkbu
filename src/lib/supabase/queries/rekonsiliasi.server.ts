import { createAdminClient } from "@/lib/supabase/admin";

export async function getRekonsiliasiData() {
   const admin = createAdminClient();

   const [poAktifResult, poMenungguResult, armadaResult] = await Promise.all([
      admin
         .from("po")
         .select("*, profiles!po_id_fkey(email, full_name)")
         .eq("status_verifikasi", "aktif")
         .order("created_at", { ascending: false }),
      admin
         .from("po")
         .select("*, profiles!po_id_fkey(email, full_name)")
         .eq("status_verifikasi", "menunggu")
         .order("created_at", { ascending: false }),
      admin
         .from("armada")
         .select("*, po:po_id(kode_po, nama_perusahaan)")
         .order("created_at", { ascending: false }),
   ]);

   return {
      poAktif: poAktifResult.data ?? [],
      poMenunggu: poMenungguResult.data ?? [],
      armada: armadaResult.data ?? [],
   };
}
