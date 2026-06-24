import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";

const ALLOWED_ROLES = ["admin-terminal", "staf-iw"] as const;

type AllowedRole = (typeof ALLOWED_ROLES)[number];

function isAllowedRole(role: string | null | undefined): role is AllowedRole {
   return ALLOWED_ROLES.includes(role as AllowedRole);
}

function normalizeText(value: unknown) {
   return typeof value === "string" ? value.trim() : "";
}

async function requirePetugasActor() {
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

export async function GET(request: Request) {
   try {
      const { actor, error } = await requirePetugasActor();
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
      const { data, error: queryError } = await adminClient
         .from("petugas_terminal")
         .select("id, nama, is_active, created_at, updated_at")
         .eq("terminal_id", terminalResult.terminalId)
         .order("created_at", { ascending: false });

      if (queryError) {
         return NextResponse.json({ message: queryError.message }, { status: 500 });
      }

      return NextResponse.json({ data: data ?? [] });
   } catch (error: unknown) {
      return NextResponse.json(
         { message: error instanceof Error ? error.message : "Internal error" },
         { status: 500 },
      );
   }
}

export async function PATCH(request: Request) {
   try {
      const { actor, error } = await requirePetugasActor();
      if (error) return error;

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
            { message: existingError.message },
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
            { message: updateError.message },
            { status: 400 },
         );
      }

      if (!isActive) {
         await adminClient
            .from("petugas_pin_sessions")
            .delete()
            .eq("petugas_terminal_id", id);
      }

      return NextResponse.json({ data });
    } catch (error: unknown) {
      return NextResponse.json(
         { message: error instanceof Error ? error.message : "Internal error" },
         { status: 500 },
      );
   }
}

export async function DELETE(request: Request) {
   try {
      const { actor, error } = await requirePetugasActor();
      if (error) return error;

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
            { message: existingError.message },
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
            { message: deleteError.message },
            { status: 500 },
         );
      }

      return NextResponse.json({ success: true });
   } catch (error: unknown) {
      return NextResponse.json(
         { message: error instanceof Error ? error.message : "Internal error" },
         { status: 500 },
      );
   }
}
