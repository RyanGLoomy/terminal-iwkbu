import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { normalizeRoleName } from "@/lib/supabase/role-utils";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

export async function PATCH(
   request: NextRequest,
   context: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await requireActor(ROLES.STAF_IW);

      const { id } = await context.params;

      if (id === actor.user.id) {
         return NextResponse.json(
            { message: "Anda tidak dapat mengubah role akun sendiri." },
            { status: 400 },
         );
      }

      const body = await request.json();
      const newRoleName = body?.role as string | undefined;

      if (!newRoleName) {
         return NextResponse.json(
            { message: "Role wajib diisi." },
            { status: 400 },
         );
      }

      // Per spec (UC-13): Staf IW hanya mengelola akun admin-terminal & staf-iw.
      const MANAGEABLE_ROLES: string[] = [ROLES.ADMIN_TERMINAL, ROLES.STAF_IW];
      if (!MANAGEABLE_ROLES.includes(newRoleName)) {
         return NextResponse.json(
            { message: "Role tidak diizinkan untuk dikelola oleh Staf IW." },
            { status: 400 },
         );
      }

      const admin = createAdminClient();

      const { data: roleRow } = await admin
         .from("roles")
         .select("id, name")
         .eq("name", newRoleName)
         .single();

      if (!roleRow) {
         return NextResponse.json(
            { message: `Role "${newRoleName}" tidak ditemukan.` },
            { status: 400 },
         );
      }

      const { data: targetProfile } = await admin
         .from("profiles")
         .select("id, email, full_name")
         .eq("id", id)
         .single();

      if (!targetProfile) {
         return NextResponse.json(
            { message: "User tidak ditemukan." },
            { status: 404 },
         );
      }

      // Cegah eskalasi privilege (vertikal): hanya akun yang SAAT INI ber-role
      // admin-terminal/staf-iw yang boleh diubah. Sebelumnya hanya role TUJUAN
      // yang dicek, sehingga PO/loket baru daftar bisa dipromosikan jadi staf-iw.
      const { data: currentRoleRows } = await admin
         .from("user_roles")
         .select("role:roles(name)")
         .eq("user_id", id);
      // PostgREST join role:roles(name) dapat diketik sebagai array atau objek
      // tunggal tergantung inferensi tipe; tangani keduanya.
      const currentRoleNames = (currentRoleRows ?? [])
         .map((row) => {
            const role = (row as {
               role?: { name?: string } | { name?: string }[] | null;
            }).role;
            if (!role) return null;
            if (Array.isArray(role)) return role[0]?.name ?? null;
            return role.name ?? null;
         })
         .filter((n): n is string => Boolean(n));
      const allManageable =
         currentRoleNames.length > 0 &&
         currentRoleNames.every(
            (n) =>
               MANAGEABLE_ROLES.includes(
                  normalizeRoleName(n) as (typeof MANAGEABLE_ROLES)[number],
               ),
         );
      if (!allManageable) {
         await logActivity(
            "UPDATE_USER",
            `Upaya ubah role ditolak (target bukan akun internal): ${targetProfile.email}`,
            { target_user_id: id, current_roles: currentRoleNames },
            { actorUserId: actor.user.id },
         );
         return NextResponse.json(
            {
               message:
                  "Hanya akun admin-terminal/staf-iw yang dapat diubah.",
            },
            { status: 403 },
         );
      }

       const { error: insertError } = await admin
          .from("user_roles")
          .insert({ user_id: id, role_id: roleRow.id })
          .select();

      if (insertError) {
         return NextResponse.json(
            { message: "Terjadi kesalahan internal" },
            { status: 500 },
         );
      }

      await admin
         .from("user_roles")
         .delete()
         .eq("user_id", id)
         .neq("role_id", roleRow.id);

      await admin.auth.admin.updateUserById(id, {
         app_metadata: { role: newRoleName },
      });

      await logActivity(
         "UPDATE_USER",
         `Mengubah role ${targetProfile.email} menjadi ${newRoleName}`,
         {
            target_user_id: id,
            target_email: targetProfile.email,
            old_role: currentRoleNames,
            new_role: newRoleName,
         },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ success: true });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
