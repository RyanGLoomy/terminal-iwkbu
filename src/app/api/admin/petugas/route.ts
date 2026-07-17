import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { sanitizeDbError, getErrorMessage } from "@/lib/db-error";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import { resolveTerminalId } from "@/lib/auth/petugas-context.server";
import {
   EMAIL_PATTERN,
   PASSWORD_POLICY_MESSAGE,
   normalizeEmail,
   normalizeText,
   randomSuffix,
   validateAccountPassword,
} from "@/lib/auth/account-helpers.server";

// Per spec (UC-12): manajemen akun petugas/loket adalah peran Admin Terminal.
// Staf IW tidak boleh membuat/mengelola akun petugas/loket.

function generatePassword() {
   return `Iw-${randomSuffix(6)}-${randomSuffix(4)}`;
}

async function getLoketRoleId(adminClient: ReturnType<typeof createAdminClient>) {
   const { data, error } = await adminClient
      .from("roles")
      .select("id")
      .eq("name", "loket")
      .single();

   if (error || !data) {
      throw new Error("Role loket tidak ditemukan");
   }

   return data.id as string;
}

async function cleanupCreatedLoketUser(
   adminClient: ReturnType<typeof createAdminClient>,
   userId: string,
) {
   await adminClient.from("user_roles").delete().eq("user_id", userId);
   await adminClient.from("profiles").delete().eq("id", userId);
   await adminClient.auth.admin.deleteUser(userId);
}

async function getLoketProfile(params: {
   adminClient: ReturnType<typeof createAdminClient>;
   loketRoleId: string;
   userId: string;
}) {
   const { data, error } = await params.adminClient
      .from("profiles")
      .select(
         "id, email, full_name, is_active, terminal_id, created_at, user_roles!inner(role_id)",
      )
      .eq("id", params.userId)
      .eq("user_roles.role_id", params.loketRoleId)
      .maybeSingle();

   if (error) throw error;
   return data;
}

function stripRoleRelation(row: Record<string, unknown>) {
   const { user_roles, ...profile } = row;
   void user_roles;
   return profile;
}

export async function GET(request: Request) {
   try {
      const actor = await requireActor(ROLES.ADMIN_TERMINAL);

      const url = new URL(request.url);
      const terminalResult = resolveTerminalId({
         role: actor.role,
         actorTerminalId: actor.terminalId,
         requestedTerminalId: url.searchParams.get("terminal_id")?.trim(),
      });

      if ("message" in terminalResult) {
         return NextResponse.json(
            { message: terminalResult.message },
            { status: terminalResult.status },
         );
      }

      const adminClient = createAdminClient();
      const loketRoleId = await getLoketRoleId(adminClient);

      const { data, error: queryError } = await adminClient
         .from("profiles")
         .select(
            "id, email, full_name, is_active, terminal_id, created_at, user_roles!inner(role_id)",
         )
         .eq("terminal_id", terminalResult.terminalId)
         .eq("user_roles.role_id", loketRoleId)
         .order("created_at", { ascending: false });

      if (queryError) {
         return NextResponse.json({ message: sanitizeDbError(queryError, "petugas list") }, { status: 500 });
      }

      return NextResponse.json({
         data: (data ?? []).map((row) => stripRoleRelation(row)),
      });
   } catch (error) {
      return actorErrorHandler(error);
   }
}

export async function POST(request: Request) {
   try {
      const actor = await requireActor(ROLES.ADMIN_TERMINAL);

      const body = await request.json().catch(() => null);
      const label = normalizeText(body?.label);
      const inputEmail = normalizeEmail(body?.email);
      const inputPassword = normalizeText(body?.password);
      const terminalResult = resolveTerminalId({
         role: actor.role,
         actorTerminalId: actor.terminalId,
         requestedTerminalId: normalizeText(body?.terminal_id),
      });

      if (!label) {
         return NextResponse.json(
            { message: "Nama device wajib diisi" },
            { status: 400 },
         );
      }

      if (inputEmail && !EMAIL_PATTERN.test(inputEmail)) {
         return NextResponse.json(
            { message: "Format email tidak valid" },
            { status: 400 },
         );
      }

      if (inputPassword && !validateAccountPassword(inputPassword)) {
         return NextResponse.json(
            { message: PASSWORD_POLICY_MESSAGE },
            { status: 400 },
         );
      }

      if ("message" in terminalResult) {
         return NextResponse.json(
            { message: terminalResult.message },
            { status: terminalResult.status },
         );
      }

      const adminClient = createAdminClient();
      const loketRoleId = await getLoketRoleId(adminClient);
      const { data: terminal, error: terminalError } = await adminClient
         .from("terminals")
         .select("kode")
         .eq("id", terminalResult.terminalId)
         .single();

      if (terminalError || !terminal) {
         return NextResponse.json(
            { message: "Terminal tidak valid" },
            { status: 400 },
         );
      }

      const email =
         inputEmail ||
         `loket-${String(terminal.kode).toLowerCase()}-${randomSuffix(5)}@terminal.local`;
      const password = inputPassword || generatePassword();

      const { data: authData, error: authError } =
          await adminClient.auth.admin.createUser({
             email,
             password,
             email_confirm: true,
          });

      if (authError || !authData?.user?.id) {
         const authMsg = getErrorMessage(authError);
         return NextResponse.json(
            {
               message: authMsg.toLowerCase().includes("already")
                  ? "Email sudah terdaftar"
                  : "Gagal membuat akun",
            },
            { status: 400 },
         );
      }

      const userId = authData.user.id;
      const { error: profileError } = await adminClient.from("profiles").upsert(
         {
            id: userId,
            email,
            full_name: label,
            terminal_id: terminalResult.terminalId,
            is_active: true,
         },
         { onConflict: "id" },
      );

      if (profileError) {
         await cleanupCreatedLoketUser(adminClient, userId).catch(() => undefined);
         return NextResponse.json(
            { message: sanitizeDbError(profileError, "petugas create profile") },
            { status: 400 },
         );
      }

      const { error: userRolesError } = await adminClient
         .from("user_roles")
         .upsert({
            user_id: userId,
            role_id: loketRoleId,
         });

      if (userRolesError) {
         await cleanupCreatedLoketUser(adminClient, userId).catch(() => undefined);
         return NextResponse.json(
            { message: sanitizeDbError(userRolesError, "petugas create role") },
            { status: 400 },
         );
       }

      await logActivity(
         "BUAT_USER",
         `Membuat akun loket ${email}`,
         { user_id: userId, email, terminal_id: terminalResult.terminalId },
      );

      return NextResponse.json({
         password: inputPassword ? null : password,
         user_id: userId,
      });
   } catch (error) {
      return actorErrorHandler(error);
   }
}

export async function PATCH(request: Request) {
   try {
      const actor = await requireActor(ROLES.ADMIN_TERMINAL);

      const body = await request.json().catch(() => null);
      const id = normalizeText(body?.id);
      const fullName = normalizeText(body?.full_name);
      const passwordInput = normalizeText(body?.password);
      const resetPassword = body?.reset_password === true;
      const isActive =
         typeof body?.is_active === "boolean" ? body.is_active : undefined;

      if (!id) {
         return NextResponse.json(
            { message: "ID akun loket wajib diisi" },
            { status: 400 },
         );
      }

      if (passwordInput && !validateAccountPassword(passwordInput)) {
         return NextResponse.json(
            { message: PASSWORD_POLICY_MESSAGE },
            { status: 400 },
         );
      }

      if (!fullName && isActive === undefined && !resetPassword && !passwordInput) {
         return NextResponse.json(
            { message: "Tidak ada perubahan yang dikirim" },
            { status: 400 },
         );
      }

      const adminClient = createAdminClient();
      const loketRoleId = await getLoketRoleId(adminClient);
      const existing = await getLoketProfile({ adminClient, loketRoleId, userId: id });

      if (!existing) {
         return NextResponse.json(
            { message: "Akun loket tidak ditemukan" },
            { status: 404 },
         );
      }

      const terminalResult = resolveTerminalId({
         role: actor.role,
         actorTerminalId: actor.terminalId,
         requestedTerminalId: existing.terminal_id,
      });

      if ("message" in terminalResult) {
         return NextResponse.json(
            { message: terminalResult.message },
            { status: terminalResult.status },
         );
      }

      const profileUpdate: Record<string, string | boolean> = {};
      if (fullName) profileUpdate.full_name = fullName;
      if (isActive !== undefined) profileUpdate.is_active = isActive;

      if (Object.keys(profileUpdate).length > 0) {
         const { error: updateError } = await adminClient
            .from("profiles")
            .update(profileUpdate)
            .eq("id", id);

         if (updateError) {
            return NextResponse.json(
               { message: sanitizeDbError(updateError, "petugas update profile") },
               { status: 400 },
            );
         }

         if (isActive === false) {
            await adminClient
               .from("petugas_pin_sessions")
               .delete()
               .eq("user_id", id);
         }
      }

      let generatedPassword: string | null = null;
      const password = passwordInput || (resetPassword ? generatePassword() : "");
      if (password) {
         const { error: authError } = await adminClient.auth.admin.updateUserById(
            id,
            { password },
         );

         if (authError) {
            return NextResponse.json(
               { message: sanitizeDbError(authError, "petugas update password") },
               { status: 400 },
            );
         }

         generatedPassword = passwordInput ? null : password;
      }

      const updated = await getLoketProfile({ adminClient, loketRoleId, userId: id });

      await logActivity(
         "UPDATE_USER",
         `Memperbarui akun loket ${existing.email}`,
         {
            user_id: id,
            changes: {
               full_name: fullName || undefined,
               is_active: isActive,
               reset_password: resetPassword || undefined,
            },
         },
      );

      return NextResponse.json({
         data: updated ? stripRoleRelation(updated) : null,
         password: generatedPassword,
      });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
