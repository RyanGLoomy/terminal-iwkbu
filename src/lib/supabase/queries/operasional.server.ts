import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
   ActivityLog,
   AdminTerminalStats,
   AdminRekapRow,
   AksiLog,
   DailyTrendRow,
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

// Server-side active shift session for SSR pre-fetching
export async function getActiveShiftSession() {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) return null;

   const { data, error } = await supabase
      .from("sesi_petugas")
      .select("*")
      .eq("petugas_id", user.id)
      .eq("status", "aktif")
      .order("waktu_mulai", { ascending: false })
      .limit(1)
      .maybeSingle();

   if (error) throw error;
   return data as import("./operasional.types").ShiftSession | null;
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
    // Use the user-scoped client (not admin) so auth.uid() resolves inside the
    // SECURITY DEFINER RPC — get_activity_logs checks auth.uid() for authz.
    // The admin client (service-role) has no user JWT → auth.uid() is NULL → 42501.
    const supabase = await createClient();

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

// Server-side weekly trend for SSR pre-fetching
const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export async function getWeeklyTrend(
   petugasId?: string,
): Promise<DailyTrendRow[]> {
   const supabase = await createClient();

   const days: DailyTrendRow[] = [];
   const today = new Date();

   for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const tanggal = d.toISOString().slice(0, 10);
      days.push({
         tanggal,
         label: DAY_LABELS[d.getDay()],
         masuk: 0,
         keluar: 0,
         total: 0,
      });
   }

   const startDate = days[0].tanggal;
   const endDate = days[days.length - 1].tanggal;

   const start = new Date(`${startDate}T00:00:00`).toISOString();
   const end = new Date(`${endDate}T23:59:59.999`).toISOString();

   // Fetch masuk counts
   let masukQuery = supabase
      .from("kendaraan_masuk")
      .select("waktu_masuk")
      .gte("waktu_masuk", start)
      .lte("waktu_masuk", end);
   if (petugasId) {
      masukQuery = masukQuery.eq("petugas_id", petugasId);
   }
   const { data: masukRows } = await masukQuery;

   // Fetch keluar counts
   let keluarQuery = supabase
      .from("kendaraan_keluar")
      .select("waktu_keluar")
      .gte("waktu_keluar", start)
      .lte("waktu_keluar", end);
   if (petugasId) {
      keluarQuery = keluarQuery.eq("petugas_id", petugasId);
   }
   const { data: keluarRows } = await keluarQuery;

   // Aggregate by date
   for (const row of masukRows ?? []) {
      const date = new Date(row.waktu_masuk).toISOString().slice(0, 10);
      const entry = days.find((d) => d.tanggal === date);
      if (entry) entry.masuk++;
   }

   for (const row of keluarRows ?? []) {
      const date = new Date(row.waktu_keluar).toISOString().slice(0, 10);
      const entry = days.find((d) => d.tanggal === date);
      if (entry) entry.keluar++;
   }

   for (const day of days) {
      day.total = day.masuk + day.keluar;
   }

   return days;
}

export async function logActivity(
   aksi: AksiLog,
   deskripsi: string,
   metadata: Record<string, unknown> = {},
   options?: { actorUserId?: string },
) {
   try {
      let userId = options?.actorUserId;

      if (!userId) {
         const supabase = await createClient();
         const {
            data: { user },
         } = await supabase.auth.getUser();
         userId = user?.id;
      }

      if (!userId) return;

      const adminClient = createAdminClient();
      const { error } = await adminClient.from("activity_logs").insert({
         user_id: userId,
         aksi,
         deskripsi,
         metadata,
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
