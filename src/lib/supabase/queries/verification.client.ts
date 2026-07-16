import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type { Armada, PO, ArmadaDokumen } from "@/lib/supabase/queries/verification.types";

// ============================================================
// REGISTRASI PO
// ============================================================

export async function registerPO(data: {
   email: string;
   password: string;
   kode_po: string;
   nama_perusahaan: string;
   nama_pemilik?: string;
   alamat?: string;
   telepon?: string;
   npwp?: string;
}) {
   const supabase = createBrowserClient();

   const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
         data: {
            full_name: data.nama_pemilik || data.nama_perusahaan,
         },
      },
   });

   if (authError) throw authError;
   if (!authData.user) throw new Error("Registrasi gagal");

   const res = await fetch("/api/auth/register-po", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
         kode_po: data.kode_po,
         nama_perusahaan: data.nama_perusahaan,
         nama_pemilik: data.nama_pemilik,
         alamat: data.alamat,
         telepon: data.telepon,
         npwp: data.npwp,
      }),
   });

   const payload = await res.json();
   if (!res.ok) throw new Error(payload?.message ?? "Registrasi PO gagal");

   return authData.user;
}

// ============================================================
// READ ARMADA (PO)
// ============================================================

export async function getArmadaByPO(poId: string) {
   const supabase = createBrowserClient();

   const { data, error } = await supabase
      .from("armada")
      .select("*")
      .eq("po_id", poId)
      .order("created_at", { ascending: false });

   if (error) throw error;
   return data as Armada[];
}

// ============================================================
// CREATE ARMADA (PO only)
// ============================================================

export async function createArmada(
   data: Partial<
      Pick<
         Armada,
         | "nomor_polisi"
         | "nomor_lambung"
         | "merk"
         | "tipe"
         | "tahun_pembuatan"
         | "nomor_chassis"
         | "nomor_mesin"
         | "kapasitas_penumpang"
         | "status_operasional"
      >
   >,
) {
   const res = await fetch("/api/po/armada", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
   });
   const payload = await res.json();
   if (!res.ok) throw new Error(payload?.message ?? "Gagal membuat armada");
   return payload.data as Armada;
}

// ============================================================
// UPDATE ARMADA (PO)
// ============================================================

export async function updateArmadaByPO(
   armadaId: string,
   data: Partial<
      Pick<
         Armada,
         | "nomor_polisi"
         | "nomor_lambung"
         | "merk"
         | "tipe"
         | "tahun_pembuatan"
         | "nomor_chassis"
         | "nomor_mesin"
         | "kapasitas_penumpang"
         | "status_operasional"
      >
   >,
) {
   const res = await fetch(`/api/po/armada/${armadaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
   });
   const payload = await res.json();
   if (!res.ok) throw new Error(payload?.message ?? "Gagal memperbarui armada");
   return payload.data as Armada;
}

export async function deleteArmada(armadaId: string) {
   const res = await fetch(`/api/po/armada/${armadaId}`, {
      method: "DELETE",
   });
   const payload = await res.json();
   if (!res.ok) throw new Error(payload?.message ?? "Gagal menghapus armada");
}

// ============================================================
// VERIFIKASI ARMADA (Staf IW)
// ============================================================

export async function verifikasiArmada(
   armadaId: string,
   status: "terverifikasi" | "ditolak",
   keterangan?: string,
) {
   const res = await fetch(`/api/staf-iw/armada/${armadaId}/verifikasi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, keterangan }),
   });
   const payload = await res.json();
   if (!res.ok) throw new Error(payload?.message ?? "Gagal verifikasi armada");
   return payload.data as Armada;
}

// ============================================================
// VERIFIKASI PO (Staf IW)
// ============================================================

export async function verifikasiPO(
   poId: string,
   status: "aktif" | "ditolak",
   keterangan?: string,
) {
   const res = await fetch(`/api/staf-iw/po/${poId}/verifikasi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, keterangan }),
   });
   const payload = await res.json();
   if (!res.ok) throw new Error(payload?.message ?? "Gagal verifikasi PO");
   return payload.data as PO;
}

export async function editPO(
   poId: string,
   data: Partial<
      Pick<
         PO,
         "kode_po" | "nama_perusahaan" | "nama_pemilik" | "alamat" | "telepon" | "npwp"
      >
   >,
) {
   const res = await fetch(`/api/staf-iw/po/${poId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
   });
   const payload = await res.json();
    if (!res.ok) throw new Error(payload?.message ?? "Gagal mengedit PO");
    return payload.data as PO;
}

// ============================================================
// DOKUMEN ARMADA
// ============================================================

export async function getArmadaDokumen(armadaId: string) {
   const supabase = createBrowserClient();
   const { data, error } = await supabase
      .from("armada_dokumen")
      .select("*")
      .eq("armada_id", armadaId)
      .order("created_at", { ascending: false });

   if (error) throw error;
   return data as ArmadaDokumen[];
}

export async function uploadArmadaDokumen(
   armadaId: string,
   _poId: string,
   jenis: ArmadaDokumen["jenis_dokumen"],
   file: File,
) {
   const formData = new FormData();
   formData.append("file", file);
   formData.append("jenis", jenis);

   const res = await fetch(`/api/po/armada/${armadaId}/dokumen`, {
      method: "POST",
      body: formData,
   });

   const payload = await res.json();
   if (!res.ok) {
      throw new Error(payload?.message ?? "Gagal mengunggah dokumen");
   }
   return payload.data as ArmadaDokumen;
}

export async function deleteArmadaDokumen(
   dokumenId: string,
   filePath: string,
) {
   const supabase = createBrowserClient();

   const { error: storageError } = await supabase.storage
      .from("armada-dokumen")
      .remove([filePath]);

   if (storageError) throw storageError;

   const { error: dbError } = await supabase
      .from("armada_dokumen")
      .delete()
      .eq("id", dokumenId);

   if (dbError) throw dbError;
}

export async function getArmadaDokumenUrl(filePath: string) {
   const supabase = createBrowserClient();
   const { data, error } = await supabase.storage
      .from("armada-dokumen")
      .createSignedUrl(filePath, 3600);

   if (error) throw error;
   return data.signedUrl;
}
