import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeDbError } from "@/lib/db-error";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import { resolveTerminalId } from "@/lib/auth/petugas-context.server";

function normalizeText(value: unknown) {
   return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
   try {
      const actor = await requireActor([ROLES.ADMIN_TERMINAL, ROLES.STAF_IW]);

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
      const { data, error: queryError } = await adminClient
         .from("petugas_terminal")
         .select("id, nama, is_active, created_at, updated_at")
         .eq("terminal_id", terminalResult.terminalId)
         .order("created_at", { ascending: false });

      if (queryError) {
         return NextResponse.json({ message: sanitizeDbError(queryError, "petugas-terminal list") }, { status: 500 });
      }

      return NextResponse.json({ data: data ?? [] });
   } catch (error) {
      return actorErrorHandler(error);
   }
}

export async function PATCH(request: Request) {
   try {
      const actor = await requireActor([ROLES.ADMIN_TERMINAL, ROLES.STAF_IW]);

      const body = await request.json().catch(() => null);
      const id = normalizeText(body?.id);
      const isActive = body?.is_active;

      if (!id || typeof isActive !== "boolean") {
         return NextResponse.json(
            { message: "ID petugas dan status aktif wajib diisi" },
            { status: 400 },
         );
      }

      const adminClient = createAdminClient();
      const { data: existing, error: existingError } = await adminClient
         .from("petugas_terminal")
         .select("id, terminal_id")
         .eq("id", id)
         .maybeSingle();

      if (existingError) {
         return NextResponse.json(
            { message: sanitizeDbError(existingError, "petugas-terminal update") },
            { status: 500 },
         );
      }

      if (!existing) {
         return NextResponse.json(
            { message: "Petugas tidak ditemukan" },
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

      const { data, error: updateError } = await adminClient
         .from("petugas_terminal")
         .update({ is_active: isActive })
         .eq("id", id)
         .select("id, nama, is_active, created_at, updated_at")
         .single();

      if (updateError) {
         return NextResponse.json(
            { message: sanitizeDbError(updateError, "petugas-terminal update") },
            { status: 400 },
         );
      }

      if (!isActive) {
         await adminClient
            .from("petugas_pin_sessions")
            .delete()
            .eq("petugas_terminal_id", id);
      }

      await logActivity(
         "UPDATE_PETUGAS_TERMINAL",
         `${isActive ? "Aktifkan" : "Nonaktifkan"} petugas terminal: ${data.nama ?? id}`,
         { petugas_terminal_id: id, is_active: isActive },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ data });
   } catch (error) {
      return actorErrorHandler(error);
   }
}

export async function DELETE(request: Request) {
   try {
      const actor = await requireActor([ROLES.ADMIN_TERMINAL, ROLES.STAF_IW]);

      const url = new URL(request.url);
      const id = url.searchParams.get("id")?.trim();

      if (!id) {
         return NextResponse.json(
            { message: "ID petugas wajib diisi" },
            { status: 400 },
         );
      }

      const adminClient = createAdminClient();
      const { data: existing, error: existingError } = await adminClient
         .from("petugas_terminal")
         .select("id, nama, terminal_id")
         .eq("id", id)
         .maybeSingle();

      if (existingError) {
         return NextResponse.json(
            { message: sanitizeDbError(existingError, "petugas-terminal delete") },
            { status: 500 },
         );
      }

      if (!existing) {
         return NextResponse.json(
            { message: "Petugas tidak ditemukan" },
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

      const { error: deleteError } = await adminClient
         .from("petugas_terminal")
         .delete()
         .eq("id", id);

      if (deleteError) {
         return NextResponse.json(
            { message: sanitizeDbError(deleteError, "petugas-terminal delete") },
            { status: 500 },
         );
      }

      await logActivity(
         "HAPUS_PETUGAS_TERMINAL",
         `Hapus petugas terminal: ${existing.nama ?? id}`,
         { petugas_terminal_id: id },
         { actorUserId: actor.user.id },
      );

      return NextResponse.json({ success: true });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
