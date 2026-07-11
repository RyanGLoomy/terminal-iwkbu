import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type {
   ActivePO,
   ActiveMasuk,
   KendaraanMasuk,
   KendaraanKeluar,
   PinSession,
   RekapHarianRow,
   ShiftSession,
   RekapSesiRow,
   DetailSesiRow,
   PetugasDashboardRPC,
   DailyTrendRow,
   TerminalReport,
} from "@/lib/supabase/queries/operasional.types";

type MasukPoJoin = NonNullable<ActiveMasuk["po"]>;
type MasukArmadaJoin = NonNullable<ActiveMasuk["armada"]>;
type RekapPoJoin = NonNullable<RekapHarianRow["po"]>;
type RekapArmadaJoin = NonNullable<RekapHarianRow["armada"]>;

type ActiveMasukQueryRow = {
   id: string;
   sesi_id: string;
   petugas_id: string;
   nomor_polisi: string;
   waktu_masuk: string;
   po: MasukPoJoin | MasukPoJoin[] | null;
   armada: MasukArmadaJoin | MasukArmadaJoin[] | null;
   kendaraan_keluar: { id: string } | { id: string }[] | null;
};

type RekapHarianQueryRow = {
   id: string;
   nomor_polisi: string;
   waktu_masuk: string;
   po: RekapPoJoin | RekapPoJoin[] | null;
   armada: RekapArmadaJoin | RekapArmadaJoin[] | null;
   kendaraan_keluar:
      | { waktu_keluar: string }
      | { waktu_keluar: string }[]
      | null;
};

function normalizeNomorPolisi(value: string) {
   return value.trim().toUpperCase();
}

async function postJson<T>(url: string, body: unknown, fallbackMessage: string) {
   const response = await fetch(url, {
      method: "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
   });
   const payload = await response.json().catch(() => null);

   if (!response.ok) {
      throw new Error(payload?.message ?? payload?.error ?? fallbackMessage);
   }

   return payload as T;
}

export async function getPinSession() {
   const res = await fetch("/api/auth/pin-session");
   const json = await res.json();

   if (!res.ok) {
      throw new Error(json?.message ?? "Gagal memeriksa sesi PIN");
   }

   if (!json.verified) return null;

   return {
      user_id: json.user_id,
      verified_at: json.verified_at,
      expires_at: json.expires_at,
      updated_at: json.updated_at,
   } as PinSession;
}

async function ensurePinSession() {
   const session = await getPinSession();
   if (!session) throw new Error("PIN belum diverifikasi");
}

export async function verifyPetugasPin(pin: string) {
   const res = await fetch("/api/auth/verify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin_input: pin }),
   });

   const json = await res.json();

   if (!res.ok) {
      throw new Error(json?.message ?? "Gagal memverifikasi PIN");
   }

   return {
      verified: json.verified === true,
      petugas_id: json.petugas_id ?? undefined,
      petugas_nama: json.petugas_nama ?? undefined,
      session: json.session as PinSession | undefined,
   };
}

export async function clearPinSession() {
   const res = await fetch("/api/auth/pin-session", {
      method: "DELETE",
   });

   if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.message ?? "Gagal menghapus sesi PIN");
   }
}

async function ensureActiveSession(params: {
   sessionId: string;
   petugasId: string;
}) {
   const supabase = createBrowserClient();

   const { data, error } = await supabase
      .from("sesi_petugas")
      .select("id, waktu_selesai, status")
      .eq("id", params.sessionId)
      .eq("petugas_id", params.petugasId)
      .maybeSingle();

   if (error) throw error;
   if (!data) throw new Error("Sesi kerja tidak ditemukan");
   if (data.status !== "aktif" || data.waktu_selesai)
      throw new Error("Sesi kerja sudah ditutup");
}

export async function getActiveShiftSession() {
   const supabase = createBrowserClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) throw new Error("Unauthorized");

   const { data, error } = await supabase
      .from("sesi_petugas")
      .select("*")
      .eq("petugas_id", user.id)
      .eq("status", "aktif")
      .order("waktu_mulai", { ascending: false })
      .limit(1)
      .maybeSingle();

   if (error) throw error;
   return data as ShiftSession | null;
}

export async function openShiftSession() {
   const payload = await postJson<{ data: ShiftSession }>(
      "/api/sesi/open",
      undefined,
      "Gagal membuka sesi kerja",
   );

   return payload.data;
}

export async function closeShiftSession(sessionId: string) {
   const payload = await postJson<{ data: ShiftSession }>(
      "/api/sesi/close",
      { sesi_id: sessionId },
      "Gagal menutup sesi kerja",
   );

   return payload.data;
}

export async function listActivePOs() {
   const supabase = createBrowserClient();

   const { data, error } = await supabase
      .from("po")
      .select("id, kode_po, nama_perusahaan")
      .eq("status_verifikasi", "aktif")
      .order("nama_perusahaan", { ascending: true });

   if (error) throw error;
   return (data ?? []) as ActivePO[];
}

export async function searchArmadaByNopol(
   nomorPolisi: string,
): Promise<{ po_id: string; po_kode: string; po_nama: string; merk: string | null; tipe: string | null } | null> {
   const supabase = createBrowserClient();
   const normalized = normalizeNomorPolisi(nomorPolisi);
   if (!normalized) return null;

   const { data, error } = await supabase
      .from("armada")
      .select("po_id, merk, tipe, po:po_id(kode_po, nama_perusahaan)")
      .eq("nomor_polisi", normalized)
      .limit(1)
      .maybeSingle();

   if (error || !data) return null;
   const row = data as { po_id: string; merk: string | null; tipe: string | null; po: { kode_po: string; nama_perusahaan: string } | null };
   if (!row.po_id) return null;
   return {
      po_id: row.po_id,
      po_kode: row.po?.kode_po ?? "",
      po_nama: row.po?.nama_perusahaan ?? "",
      merk: row.merk,
      tipe: row.tipe,
   };
}

export async function catatKendaraanMasuk(params: {
   nomor_polisi: string;
   po_id: string;
   sesi_id: string;
}) {
   const supabase = createBrowserClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) throw new Error("Unauthorized");

   await ensurePinSession();
   await ensureActiveSession({ sessionId: params.sesi_id, petugasId: user.id });

   const nomor_polisi = normalizeNomorPolisi(params.nomor_polisi);
   const payload = await postJson<{ data: KendaraanMasuk }>(
      "/api/transaksi/masuk",
      {
         sesi_id: params.sesi_id,
         po_id: params.po_id,
         nomor_polisi,
      },
      "Gagal mencatat kendaraan masuk",
   );

   return payload.data;
}

export async function catatKendaraanKeluar(params: {
   masuk_id: string;
   sesi_id: string;
}) {
   const supabase = createBrowserClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) throw new Error("Unauthorized");

   await ensurePinSession();
   await ensureActiveSession({ sessionId: params.sesi_id, petugasId: user.id });
   const payload = await postJson<{ data: KendaraanKeluar }>(
      "/api/transaksi/keluar",
      {
         sesi_id: params.sesi_id,
         masuk_id: params.masuk_id,
      },
      "Gagal mencatat kendaraan keluar",
   );

   return payload.data;
}

export async function listActiveMasuk(sesiId: string) {
   const supabase = createBrowserClient();

   const { data, error } = await supabase
      .from("kendaraan_masuk")
      .select(
         "id, sesi_id, petugas_id, nomor_polisi, waktu_masuk, po:po_id(kode_po, nama_perusahaan), armada:armada_id(nomor_lambung, merk, tipe), kendaraan_keluar(id)",
      )
      .eq("sesi_id", sesiId)
      .order("waktu_masuk", { ascending: false });

   if (error) throw error;

   return (data ?? [])
      .filter((row: ActiveMasukQueryRow) => {
          const keluar = Array.isArray(row.kendaraan_keluar)
             ? row.kendaraan_keluar[0]
             : row.kendaraan_keluar;
          return !keluar;
      })
      .map((row: ActiveMasukQueryRow) => {
         const po = Array.isArray(row.po) ? row.po[0] : row.po;
         const armada = Array.isArray(row.armada) ? row.armada[0] : row.armada;

         return {
            id: row.id,
            sesi_id: row.sesi_id,
            petugas_id: row.petugas_id,
            nomor_polisi: row.nomor_polisi,
            waktu_masuk: row.waktu_masuk,
            po: po ?? null,
            armada: armada ?? null,
         } satisfies ActiveMasuk;
      });
}

export async function getRekapHarian(tanggal: string) {
   const supabase = createBrowserClient();

   const start = new Date(`${tanggal}T00:00:00`).toISOString();
   const end = new Date(`${tanggal}T23:59:59.999`).toISOString();

   const { data, error } = await supabase
      .from("kendaraan_masuk")
      .select(
         "id, nomor_polisi, waktu_masuk, po:po_id(kode_po, nama_perusahaan), armada:armada_id(nomor_lambung, merk, tipe), kendaraan_keluar(waktu_keluar)",
      )
      .gte("waktu_masuk", start)
      .lte("waktu_masuk", end)
      .order("waktu_masuk", { ascending: false });

   if (error) throw error;

    return (data ?? []).map((row: RekapHarianQueryRow) => {
      // kendaraan_keluar.masuk_id punya constraint UNIQUE -> PostgREST
      // mengembalikan single object (to-one), bukan array. Akses langsung,
      // jangan drop kasus single-object (bug sebelumnya: selalu null).
      const keluar = Array.isArray(row.kendaraan_keluar)
         ? row.kendaraan_keluar[0]
         : row.kendaraan_keluar;
      const po = Array.isArray(row.po) ? row.po[0] : row.po;
      const armada = Array.isArray(row.armada) ? row.armada[0] : row.armada;

      return {
         id: row.id,
         nomor_polisi: row.nomor_polisi,
         waktu_masuk: row.waktu_masuk,
         waktu_keluar: keluar?.waktu_keluar ?? null,
         po: po ?? null,
         armada: armada ?? null,
      } satisfies RekapHarianRow;
   });
}

// ── Sprint 4: Petugas Dashboard (RPC) ───────────────────

export async function getPetugasDashboardStatsRPC() {
   const supabase = createBrowserClient();

   const { data, error } = await supabase.rpc("get_petugas_dashboard_stats");

   if (error) throw error;

   return (data ?? {
      sesi_aktif: null,
      total_masuk_hari_ini: 0,
      total_keluar_hari_ini: 0,
      total_transaksi_hari_ini: 0,
   }) as PetugasDashboardRPC;
}

// ── Sprint 4: Rekap Sesi (Admin) ────────────────────────

export async function getRekapSesi(
   terminalId: string,
   startDate: string,
   endDate: string,
) {
   const supabase = createBrowserClient();

   const { data, error } = await supabase.rpc("get_rekap_sesi", {
      p_terminal_id: terminalId,
      p_start_date: startDate,
      p_end_date: endDate,
   });

   if (error) throw error;
   return (data ?? []) as RekapSesiRow[];
}

export async function getDetailSesi(sesiId: string) {
   const supabase = createBrowserClient();

   const { data, error } = await supabase.rpc("get_detail_sesi", {
      p_sesi_id: sesiId,
   });

   if (error) throw error;
   return (data ?? []) as DetailSesiRow[];
}

export async function getTerminalReport(params: {
   terminalId: string;
   startDate: string;
   endDate: string;
}) {
   const searchParams = new URLSearchParams({
      terminalId: params.terminalId,
      startDate: params.startDate,
      endDate: params.endDate,
   });

   const response = await fetch(
      `/api/admin/reports/terminal?${searchParams.toString()}`,
      { cache: "no-store" },
   );
   const json = await response.json().catch(() => null);

   if (!response.ok) {
      throw new Error(json?.message ?? "Gagal memuat laporan terminal");
   }

   return json.data as TerminalReport;
}

// ── Sprint 5: Weekly Trend (Client) ─────────────────────

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export async function getWeeklyTrend(
   petugasId?: string,
): Promise<DailyTrendRow[]> {
   const supabase = createBrowserClient();

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
