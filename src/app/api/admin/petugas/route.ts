import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

// Per spec (UC-12): manajemen akun petugas/loket adalah peran Admin Terminal.
// Staf IW tidak boleh membuat/mengelola akun petugas/loket.
const ALLOWED_ROLES = ["admin-terminal"] as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

type AllowedRole = (typeof ALLOWED_ROLES)[number];

function randomSuffix(length: number) {
   const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
   let result = "";
   for (let i = 0; i < length; i += 1) {
      result += chars[randomInt(chars.length)];
   }
   return result;
}

function generatePassword() {
   return `Iw-${randomSuffix(6)}-${randomSuffix(4)}`;
}

function isAllowedRole(roleName: string | null | undefined): roleName is AllowedRole {
   return ALLOWED_ROLES.includes(roleName as AllowedRole);
}

function normalizeEmail(value: unknown) {
   return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeText(value: unknown) {
   return typeof value === "string" ? value.trim() : "";
}

function validatePassword(password: string) {
   return password.length >= PASSWORD_MIN_LENGTH;
}

async function requireAccountActor() {
   const actor = await getAuthenticatedActor();

   if (!actor) {
      return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
   }

   if (!isAllowedRole(actor.role)) {
      return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
   }

   return { actor };
}

function resolveTerminalId(params: {
   role: string;
   actorTerminalId?: string | null;
   requestedTerminalId?: string | null;
}) {
   if (params.role === "admin-terminal") {
      if (!params.actorTerminalId) {
         return { message: "Terminal tidak ditemukan", status: 400 } as const;
      }

      if (
         params.requestedTerminalId &&
         params.requestedTerminalId !== params.actorTerminalId
      ) {
         return { message: "Forbidden", status: 403 } as const;
      }

      return { terminalId: params.actorTerminalId } as const;
   }

   if (!params.requestedTerminalId) {
      return { message: "Terminal tidak ditemukan", status: 400 } as const;
   }

   return { terminalId: params.requestedTerminalId } as const;
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
      const { actor, error } = await requireAccountActor();
      if (error) return error;

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
         return NextResponse.json({ message: queryError.message }, { status: 500 });
      }

      return NextResponse.json({
         data: (data ?? []).map((row) => stripRoleRelation(row)),
      });
   } catch (error: unknown) {
      return NextResponse.json(
         { message: error instanceof Error ? error.message : "Internal error" },
         { status: 500 },
      );
   }
}

export async function POST(request: Request) {
   try {
      const { actor, error } = await requireAccountActor();
      if (error) return error;

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

      if (inputPassword && !validatePassword(inputPassword)) {
         return NextResponse.json(
            { message: `Password minimal ${PASSWORD_MIN_LENGTH} karakter` },
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
            user_metadata: {
               role: "loket",
            },
         });

      if (authError || !authData?.user?.id) {
         return NextResponse.json(
            {
               message: authError?.message?.toLowerCase().includes("already")
                  ? "Email sudah terdaftar"
                  : authError?.message ?? "Gagal membuat akun",
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
            { message: profileError.message },
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
            { message: userRolesError.message },
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
   } catch (error: unknown) {
      return NextResponse.json(
         { message: error instanceof Error ? error.message : "Internal error" },
         { status: 500 },
      );
   }
}

export async function PATCH(request: Request) {
   try {
      const { actor, error } = await requireAccountActor();
      if (error) return error;

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

      if (passwordInput && !validatePassword(passwordInput)) {
         return NextResponse.json(
            { message: `Password minimal ${PASSWORD_MIN_LENGTH} karakter` },
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
               { message: updateError.message },
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
               { message: authError.message },
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
   } catch (error: unknown) {
      return NextResponse.json(
         { message: error instanceof Error ? error.message : "Internal error" },
         { status: 500 },
      );
   }
}
