import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeDbError } from "@/lib/db-error";

function normalizeText(value: unknown) {
   return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
   try {
      const supabase = await createClient();
      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
         return NextResponse.json(
            { message: "Unauthorized" },
            { status: 401 },
         );
      }

      const body = await request.json().catch(() => null);
      const kode_po = normalizeText(body?.kode_po);
      const nama_perusahaan = normalizeText(body?.nama_perusahaan);
      const nama_pemilik = normalizeText(body?.nama_pemilik);
      const alamat = normalizeText(body?.alamat);
      const telepon = normalizeText(body?.telepon);
      const npwp = normalizeText(body?.npwp);

      if (!kode_po || !nama_perusahaan) {
         return NextResponse.json(
            { message: "kode_po dan nama_perusahaan wajib diisi." },
            { status: 400 },
         );
      }

      const adminClient = createAdminClient();

      // APP-01 guard: reject if the caller already holds any role or already has
      // a po master-data row. Without this, any authenticated user (loket,
      // admin-terminal, another po) could self-assign the po role and insert a
      // po row, polluting user_roles (breaks the single-role .maybeSingle()
      // assumption) and creating fake master data. Only a roleless user with no
      // existing po row (the legitimate self-registrant) may proceed.
      const { data: existingRoles } = await adminClient
         .from("user_roles")
         .select("role_id")
         .eq("user_id", user.id);
      if (existingRoles && existingRoles.length > 0) {
         return NextResponse.json(
            { message: "Akun sudah memiliki role." },
            { status: 403 },
         );
      }

      const { data: existingPo } = await adminClient
         .from("po")
         .select("id")
         .eq("id", user.id)
         .maybeSingle();
      if (existingPo) {
         return NextResponse.json(
            { message: "Data PO sudah terdaftar." },
            { status: 409 },
         );
      }

      const { data: poRole } = await adminClient
         .from("roles")
         .select("id")
         .eq("name", "po")
         .single();

      if (!poRole) {
         return NextResponse.json(
            { message: "Konfigurasi role tidak ditemukan." },
            { status: 500 },
         );
      }

      // Insert po master data FIRST so a failure (dup kode_po, CHECK, blip)
      // leaves nothing committed. The role upsert follows only on success —
      // otherwise the APP-01 guard above would block a retry (role persisted
      // without a po row → permanent lockout).
      const { error: poError } = await adminClient.from("po").insert({
         id: user.id,
         kode_po,
         nama_perusahaan,
         nama_pemilik: nama_pemilik || null,
         alamat: alamat || null,
         telepon: telepon || null,
         npwp: npwp || null,
         status_verifikasi: "menunggu",
      });

      if (poError) {
         return NextResponse.json(
            { message: sanitizeDbError(poError, "register-po") },
            { status: 400 },
         );
      }

      await adminClient.from("user_roles").upsert(
         { user_id: user.id, role_id: poRole.id },
         { onConflict: "user_id,role_id" },
      );

      return NextResponse.json({ success: true, user_id: user.id });
   } catch {
      return NextResponse.json(
         { message: "Terjadi kesalahan internal" },
         { status: 500 },
      );
   }
}
