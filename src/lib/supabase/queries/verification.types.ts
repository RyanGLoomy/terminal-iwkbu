export interface PO {
   id: string;
   kode_po: string;
   nama_perusahaan: string;
   nama_pemilik: string | null;
   alamat: string | null;
   telepon: string | null;
   npwp: string | null;
   status_verifikasi: "menunggu" | "aktif" | "ditolak";
   diverifikasi_oleh: string | null;
   tanggal_verifikasi: string | null;
   keterangan_verifikasi: string | null;
   created_at: string;
   updated_at: string;
   profiles?: {
      email: string;
      full_name: string | null;
   };
}

export interface Armada {
   id: string;
   po_id: string;
   nomor_polisi: string;
   nomor_lambung: string | null;
   merk: string | null;
   tipe: string | null;
   tahun_pembuatan: number | null;
   nomor_chassis: string | null;
   nomor_mesin: string | null;
   kapasitas_penumpang: number | null;
   status_operasional:
      | "aktif"
      | "tidak_aktif"
      | "rusak"
      | "cadangan"
      | "dijual";
   status_verifikasi: "menunggu" | "terverifikasi" | "ditolak";
   diverifikasi_oleh: string | null;
   tanggal_verifikasi: string | null;
   keterangan_verifikasi: string | null;
   created_at: string;
   updated_at: string;
    po?: {
       kode_po: string;
       nama_perusahaan: string;
    };
}

export interface ArmadaDokumen {
   id: string;
   armada_id: string;
   jenis_dokumen: "stck" | "kir" | "asuransi" | "lainnya";
   file_path: string;
   file_name: string;
   file_size: number | null;
   mime_type: string | null;
   uploaded_by: string | null;
   created_at: string;
}
