import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
   ActivityLog,
   AdminTerminalStats,
   AdminRekapRow,
   AksiLog,
   PetugasDashboardRPC,
} from "@/lib/supabase/queries/operasional.types";

export async function getAdminTerminalStats(terminalId: string) {
   const supabase = await createClient();
   const today = new Date().toISOString().slice(0, 10);

   // Call the 2-arg RPC explicitly to avoid overload ambiguity.
   const { data, error } = await supabase.rpc("get_admin_terminal_stats", {
      p_terminal_id: terminalId,
      p_date: today,
   });

   if (error) throw error;

   return (data ?? {
      total_masuk: 0,
      total_keluar: 0,
      sesi_aktif: 0,
      total_petugas: 0,
   }) as AdminTerminalStats;
}

/**
 * Count petugas_terminal rows (PIN-registered petugas) for a terminal.
 * These are the actual field officers who use PIN to clock in.
 */
export async function getPetugasPinCount(terminalId: string) {
   const supabase = await createClient();

   const { count, error } = await supabase
      .from("petugas_terminal")
      .select("id", { count: "exact", head: true })
      .eq("terminal_id", terminalId)
      .eq("is_active", true);

   if (error) throw error;
   return count ?? 0;
}

/**
 * Count profiles with role loket (loket device accounts) for a terminal.
 * Uses admin client to bypass RLS on the roles table.
 */
export async function getAkunLoketCount(terminalId: string) {
   const adminClient = createAdminClient();

   const { data: roleData, error: roleError } = await adminClient
      .from("roles")
      .select("id")
      .eq("name", "loket")
      .single();

   if (roleError || !roleData) {
      throw roleError ?? new Error("Role loket tidak ditemukan");
   }

   const { data, error } = await adminClient
      .from("profiles")
      .select("id, user_roles!inner(role_id)")
      .eq("terminal_id", terminalId)
      .eq("user_roles.role_id", roleData.id);

   if (error) {
      throw error;
   }

   return data?.length ?? 0;
}

export async function getAdminRekapHarian(terminalId: string, tanggal: string) {
   const supabase = await createClient();

   const { data, error } = await supabase.rpc("get_admin_rekap_harian", {
      p_terminal_id: terminalId,
      p_date: tanggal,
   });

   if (error) throw error;
   return (data ?? []) as AdminRekapRow[];
}

// Sprint 4: Server-side session validation for API routes
export async function validateActiveSesi(sesiId: string) {
   const supabase = await createClient();

   const { data, error } = await supabase
      .from("sesi_petugas")
      .select("id, petugas_id, terminal_id, status, waktu_selesai")
      .eq("id", sesiId)
      .eq("status", "aktif")
      .maybeSingle();

   if (error) throw error;
   if (!data) return null;

   return data;
}

// Sprint 4: Server-side petugas dashboard stats via RPC
export async function getPetugasDashboardStatsRPC() {
   const supabase = await createClient();

   const { data, error } = await supabase.rpc("get_petugas_dashboard_stats");

   if (error) throw error;
   return (data ?? {
      sesi_aktif: null,
      total_masuk_hari_ini: 0,
      total_keluar_hari_ini: 0,
      total_transaksi_hari_ini: 0,
    }) as PetugasDashboardRPC;
}

export async function getActivityLogs(params: {
   startDate: string;
   endDate: string;
   aksi?: AksiLog;
   limit: number;
   offset?: number;
}) {
   const supabase = createAdminClient();

   const { data, error } = await supabase.rpc("get_activity_logs", {
      p_start_date: params.startDate,
      p_end_date: params.endDate,
      p_aksi: params.aksi ?? null,
      p_limit: params.limit,
      p_offset: params.offset ?? 0,
   });

   if (error) throw error;
   return (data ?? []) as ActivityLog[];
}

export async function logActivity(
   aksi: AksiLog,
   deskripsi: string,
   metadata: Record<string, unknown> = {},
   options?: { actorUserId?: string },
) {
   try {
      if (options?.actorUserId) {
         const adminClient = createAdminClient();
         const { error } = await adminClient.from("activity_logs").insert({
            user_id: options.actorUserId,
            aksi,
            deskripsi,
            metadata,
         });

         if (error) {
            console.error("Failed to log activity:", error.message);
         }

         return;
      }

      const supabase = await createClient();
      const { error } = await supabase.rpc("log_activity", {
         p_aksi: aksi,
         p_deskripsi: deskripsi,
         p_metadata: metadata,
      });

      if (error) {
         console.error("Failed to log activity:", error.message);
      }
   } catch (error) {
      console.error(
         "Failed to log activity:",
         error instanceof Error ? error.message : error,
      );
   }
}
