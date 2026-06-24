import { createAdminClient } from "@/lib/supabase/admin";
import type { JenisKendaraan, SystemSetting } from "./operasional.types";

export async function getJenisKendaraan(): Promise<JenisKendaraan[]> {
   const admin = createAdminClient();
   const { data, error } = await admin
      .from("jenis_kendaraan")
      .select("*")
      .order("urutan", { ascending: true });

   if (error) throw new Error(error.message);
   return data ?? [];
}

export async function getSystemSettings(): Promise<SystemSetting[]> {
   const admin = createAdminClient();
   const { data, error } = await admin
      .from("system_settings")
      .select("*")
      .order("category", { ascending: true })
      .order("key", { ascending: true });

   if (error) throw new Error(error.message);
   return data ?? [];
}
