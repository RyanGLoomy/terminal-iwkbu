import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import {
   ensureRoleOrThrow,
   AuthorizationError,
} from "@/lib/auth/requireRole.server";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

export async function PATCH(
   request: NextRequest,
   context: { params: Promise<{ id: string }> },
) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      ensureRoleOrThrow(actor.user, actor.profile, "staf-iw");

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
      const MANAGEABLE_ROLES = ["admin-terminal", "staf-iw"];
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
         user_metadata: { role: newRoleName },
      });

      await logActivity(
         "UPDATE_USER",
         `Mengubah role ${targetProfile.email} menjadi ${newRoleName}`,
         {
            target_user_id: id,
            target_email: targetProfile.email,
            old_role: body?.old_role,
            new_role: newRoleName,
         },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ success: true });
   } catch (error) {
      if (error instanceof AuthorizationError) {
         return NextResponse.json(
            { message: "Akses ditolak" },
            { status: 403 },
         );
      }
      return NextResponse.json(
         { message: "Terjadi kesalahan internal" },
         { status: 500 },
      );
   }
}
