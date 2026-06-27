import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import {
   ensureRoleOrThrow,
   AuthorizationError,
} from "@/lib/auth/requireRole.server";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
// Per spec (UC-13): Staf IW mengelola akun admin-terminal & staf-iw.
const MANAGED_ROLES = ["admin-terminal", "staf-iw"] as const;
type ManagedRole = (typeof MANAGED_ROLES)[number];

function randomSuffix(length: number) {
   const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
   let result = "";
   for (let i = 0; i < length; i += 1) {
      result += chars[randomInt(chars.length)];
   }
   return result;
}

function generatePassword() {
   return `${randomSuffix(4).slice(0, 2).toUpperCase()}-${randomSuffix(6)}-${randomSuffix(4)}`;
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

function isManagedRole(value: string): value is ManagedRole {
   return (MANAGED_ROLES as readonly string[]).includes(value);
}

async function requireStafIwActor() {
   const actor = await getAuthenticatedActor();
   if (!actor) {
      return {
         error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
      };
   }
   try {
      ensureRoleOrThrow(actor.user, actor.profile, "staf-iw");
   } catch (error) {
      const status = error instanceof AuthorizationError ? 403 : 500;
      return {
         error: NextResponse.json({ message: "Akses ditolak" }, { status }),
      };
   }
   return { actor };
}

async function getRoleId(
   adminClient: ReturnType<typeof createAdminClient>,
   name: ManagedRole,
) {
   const { data, error } = await adminClient
      .from("roles")
      .select("id")
      .eq("name", name)
      .single();
   if (error || !data) {
      throw new Error(`Role ${name} tidak ditemukan`);
   }
   return data.id as string;
}

async function getManagedRoleIds(
   adminClient: ReturnType<typeof createAdminClient>,
) {
   const [adminTerminalRoleId, stafIwRoleId] = await Promise.all([
      getRoleId(adminClient, "admin-terminal"),
      getRoleId(adminClient, "staf-iw"),
   ]);
   return { adminTerminalRoleId, stafIwRoleId };
}

async function cleanupCreatedUser(
   adminClient: ReturnType<typeof createAdminClient>,
   userId: string,
) {
   await adminClient.from("user_roles").delete().eq("user_id", userId);
   await adminClient.from("profiles").delete().eq("id", userId);
   await adminClient.auth.admin.deleteUser(userId);
}

// GET: daftar akun admin-terminal & staf-iw
export async function GET() {
   try {
      const { error } = await requireStafIwActor();
      if (error) return error;

      const admin = createAdminClient();
      const { adminTerminalRoleId, stafIwRoleId } = await getManagedRoleIds(admin);

      const { data, error: queryError } = await admin
         .from("profiles")
         .select(
            "id, email, full_name, is_active, terminal_id, created_at, user_roles!inner(role_id, role:roles(name)), terminal:terminals(id, kode, nama)",
         )
         .in("user_roles.role_id", [adminTerminalRoleId, stafIwRoleId])
         .order("created_at", { ascending: false });

      if (queryError) {
         return NextResponse.json(
            { message: queryError.message },
            { status: 500 },
         );
      }

      return NextResponse.json({ data: data ?? [] });
   } catch (err) {
      return NextResponse.json(
         { message: err instanceof Error ? err.message : "Internal error" },
         { status: 500 },
      );
   }
}

// POST: buat akun admin-terminal atau staf-iw baru
export async function POST(request: Request) {
   try {
      const { actor, error } = await requireStafIwActor();
      if (error) return error;

      const body = await request.json().catch(() => null);
      const roleRaw = normalizeText(body?.role) || "admin-terminal";
      if (!isManagedRole(roleRaw)) {
         return NextResponse.json(
            { message: "Role tidak diizinkan" },
            { status: 400 },
         );
      }
      const role = roleRaw;
      const fullName = normalizeText(body?.full_name);
      const inputEmail = normalizeEmail(body?.email);
      const inputPassword = normalizeText(body?.password);
      const terminalId = normalizeText(body?.terminal_id);

      if (!fullName) {
         return NextResponse.json(
            { message: "Nama lengkap wajib diisi" },
            { status: 400 },
         );
      }
      // terminal wajib hanya untuk admin-terminal (staf-iw lintas-terminal).
      if (role === "admin-terminal" && !terminalId) {
         return NextResponse.json(
            { message: "Terminal wajib dipilih untuk admin terminal" },
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

      const admin = createAdminClient();
      const roleId = await getRoleId(admin, role);

      let terminalKode = "";
      if (role === "admin-terminal") {
         const { data: terminal, error: terminalError } = await admin
            .from("terminals")
            .select("kode")
            .eq("id", terminalId)
            .single();
         if (terminalError || !terminal) {
            return NextResponse.json(
               { message: "Terminal tidak valid" },
               { status: 400 },
            );
         }
         terminalKode = String(terminal.kode).toLowerCase();
      }

      const emailPrefix = role === "admin-terminal" ? `admin-${terminalKode}` : "staf-iw";
      const email =
         inputEmail || `${emailPrefix}-${randomSuffix(5)}@terminal.local`;
      const password = inputPassword || generatePassword();

      const { data: authData, error: authError } =
         await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role },
         });

      if (authError || !authData?.user?.id) {
         const msg = authError?.message ?? "Gagal membuat akun";
         return NextResponse.json(
            {
               message: msg.toLowerCase().includes("already")
                  ? "Email sudah terdaftar"
                  : msg,
            },
            { status: 400 },
         );
      }

      const userId = authData.user.id;
      const { error: profileError } = await admin.from("profiles").upsert(
         {
            id: userId,
            email,
            full_name: fullName,
            terminal_id: role === "admin-terminal" ? terminalId : null,
            is_active: true,
         },
         { onConflict: "id" },
      );
      if (profileError) {
         await cleanupCreatedUser(admin, userId).catch(() => undefined);
         return NextResponse.json(
            { message: profileError.message },
            { status: 400 },
         );
      }

      const { error: userRolesError } = await admin
         .from("user_roles")
         .upsert({ user_id: userId, role_id: roleId });
      if (userRolesError) {
         await cleanupCreatedUser(admin, userId).catch(() => undefined);
         return NextResponse.json(
            { message: userRolesError.message },
            { status: 400 },
         );
      }

      await logActivity(
         "BUAT_USER",
         `Membuat akun ${role} ${email}`,
         { user_id: userId, email, role, terminal_id: terminalId || null },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({
         password: inputPassword ? null : password,
         user_id: userId,
         role,
      });
   } catch (err) {
      return NextResponse.json(
         { message: err instanceof Error ? err.message : "Internal error" },
         { status: 500 },
      );
   }
}

// PATCH: ubah nama / aktif-nonaktif / reset password akun admin-terminal|staf-iw
export async function PATCH(request: Request) {
   try {
      const { actor, error } = await requireStafIwActor();
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
            { message: "ID akun wajib diisi" },
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

      const admin = createAdminClient();
      const { adminTerminalRoleId, stafIwRoleId } = await getManagedRoleIds(admin);

      const { data: existing, error: findError } = await admin
         .from("profiles")
         .select("id, email, full_name, terminal_id")
         .eq("id", id)
         .in("user_roles.role_id", [adminTerminalRoleId, stafIwRoleId])
         .maybeSingle();
      if (findError) throw findError;
      if (!existing) {
         return NextResponse.json(
            { message: "Akun tidak ditemukan" },
            { status: 404 },
         );
      }

      const profileUpdate: Record<string, string | boolean> = {};
      if (fullName) profileUpdate.full_name = fullName;
      if (isActive !== undefined) profileUpdate.is_active = isActive;
      if (Object.keys(profileUpdate).length > 0) {
         const { error: updateError } = await admin
            .from("profiles")
            .update(profileUpdate)
            .eq("id", id);
         if (updateError) {
            return NextResponse.json(
               { message: updateError.message },
               { status: 400 },
            );
         }
      }

      let generatedPassword: string | null = null;
      const password = passwordInput || (resetPassword ? generatePassword() : "");
      if (password) {
         const { error: authError } = await admin.auth.admin.updateUserById(id, {
            password,
         });
         if (authError) {
            return NextResponse.json(
               { message: authError.message },
               { status: 400 },
            );
         }
         generatedPassword = passwordInput ? null : password;
      }

      await logActivity(
         "UPDATE_USER",
         `Memperbarui akun ${existing.email}`,
         {
            target_user_id: id,
            changes: {
               full_name: fullName || undefined,
               is_active: isActive,
               reset_password: resetPassword || undefined,
            },
         },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ password: generatedPassword });
   } catch (err) {
      return NextResponse.json(
         { message: err instanceof Error ? err.message : "Internal error" },
         { status: 500 },
      );
   }
}
