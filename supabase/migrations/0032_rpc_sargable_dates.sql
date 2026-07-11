-- 0032_rpc_sargable_dates.sql
-- F1 (MEDIUM): get_admin_rekap_harian dan get_rekap_sesi memfilter waktu dengan
-- cast `::date` (`km.waktu_masuk::date = p_date`, `sp.waktu_mulai::date >= ...`),
-- yang membuatnya non-SARGable — index pada waktu_masuk/waktu_mulai (idx_0026)
-- tidak terpakai (seq scan dipaksa). Ganti dengan rentang half-open agar index
-- terpakai.

CREATE OR REPLACE FUNCTION public.get_admin_rekap_harian(
  p_terminal_id uuid,
  p_date date
)
returns table(
  masuk_id uuid, nomor_polisi text, waktu_masuk timestamptz,
  waktu_keluar timestamptz, petugas_nama text, po_kode text, po_nama text,
  armada_merk text, armada_tipe text, armada_lambung text
)
language sql stable
set search_path to 'public'
as $$
  select
    km.id as masuk_id,
    km.nomor_polisi,
    km.waktu_masuk,
    kk.waktu_keluar,
    coalesce(p.full_name, 'System') as petugas_nama,
    po.kode_po as po_kode,
    po.nama_perusahaan as po_nama,
    a.merk as armada_merk,
    a.tipe as armada_tipe,
    a.nomor_lambung as armada_lambung
  from kendaraan_masuk km
  join sesi_petugas sp on sp.id = km.sesi_id
  left join kendaraan_keluar kk on kk.masuk_id = km.id
  join po on po.id = km.po_id
  join armada a on a.id = km.armada_id
  left join profiles p on p.id = km.petugas_id
  where sp.terminal_id = p_terminal_id
    and km.waktu_masuk >= p_date::timestamptz
    and km.waktu_masuk <  (p_date + interval '1 day')::timestamptz
  order by km.waktu_masuk desc;
$$;

CREATE OR REPLACE FUNCTION public.get_rekap_sesi(
  p_terminal_id uuid,
  p_start_date date default current_date,
  p_end_date date default current_date
)
returns table(
  sesi_id uuid, petugas_id uuid, petugas_nama text, terminal_id uuid,
  waktu_mulai timestamptz, waktu_selesai timestamptz, status text,
  total_transaksi_masuk integer, total_transaksi_keluar integer, total_nominal numeric
)
language sql stable
set search_path to 'public'
as $$
  select
    sp.id as sesi_id,
    sp.petugas_id,
    coalesce(p.full_name, 'Unknown') as petugas_nama,
    sp.terminal_id,
    sp.waktu_mulai,
    sp.waktu_selesai,
    sp.status,
    sp.total_transaksi_masuk,
    sp.total_transaksi_keluar,
    sp.total_nominal
  from sesi_petugas sp
  join profiles p on p.id = sp.petugas_id
  where sp.terminal_id = p_terminal_id
    and sp.waktu_mulai >= p_start_date::timestamptz
    and sp.waktu_mulai <  (p_end_date + interval '1 day')::timestamptz
  order by sp.waktu_mulai desc;
$$;
