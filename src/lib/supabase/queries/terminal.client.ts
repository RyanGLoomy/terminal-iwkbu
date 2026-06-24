import { createClient as createBrowserClient } from "@/lib/supabase/client";

type Terminal = {
   id: string;
   kode: string;
   nama: string;
};

export async function listTerminals() {
   const supabase = createBrowserClient();

   const { data, error } = await supabase
      .from("terminals")
      .select("id, kode, nama")
      .order("nama", { ascending: true });

   if (error) throw error;
   return (data ?? []) as Terminal[];
}

/* ─── Petugas per Terminal (Data Petugas / PIN) ─── */

export type PetugasTerminalRow = {
   id: string;
   nama: string;
   is_active: boolean;
   created_at: string;
   updated_at: string;
};

export async function listPetugasTerminal(terminalId: string) {
   const searchParams = new URLSearchParams({ terminal_id: terminalId });
   const res = await fetch(
      `/api/admin/petugas-terminal?${searchParams.toString()}`,
      { cache: "no-store" },
   );
   const json = await res.json().catch(() => null);

   if (!res.ok) {
      throw new Error(json?.message ?? "Gagal memuat data petugas");
   }

   return (json?.data ?? []) as PetugasTerminalRow[];
}

export async function upsertPetugasTerminal(params: {
   terminal_id: string;
   nama: string;
   pin?: string;
   petugas_id?: string;
}) {
   const res = await fetch("/api/auth/upsert-petugas-terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
   });

   const json = await res.json();

   if (!res.ok) {
      throw new Error(json?.message ?? "Gagal menyimpan petugas terminal");
   }

   return json as { id: string; pin?: string };
}

export async function togglePetugasTerminal(
   petugasId: string,
   isActive: boolean,
) {
   const res = await fetch("/api/admin/petugas-terminal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: petugasId, is_active: isActive }),
   });
   const json = await res.json().catch(() => null);

   if (!res.ok) {
      throw new Error(json?.message ?? "Gagal mengubah status petugas");
   }

   return true;
}
