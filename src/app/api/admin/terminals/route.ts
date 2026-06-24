import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

const ALLOWED_ROLES = ["admin-terminal", "staf-iw"] as const;

type AllowedRole = (typeof ALLOWED_ROLES)[number];

function isAllowedRole(role: string | null | undefined): role is AllowedRole {
   return ALLOWED_ROLES.includes(role as AllowedRole);
}

function normalizeKode(value: unknown) {
   return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function normalizeNama(value: unknown) {
   return typeof value === "string" ? value.trim() : "";
}

async function requireMasterDataActor() {
   const actor = await getAuthenticatedActor();

   if (!actor) {
      return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
   }

   if (!isAllowedRole(actor.role)) {
      return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
   }

   return { actor };
}

export async function GET() {
   try {
      const { actor, error } = await requireMasterDataActor();
      if (error) return error;

      const adminClient = createAdminClient();
      let query = adminClient
         .from("terminals")
         .select("id, kode, nama")
         .order("nama", { ascending: true });

      if (actor.role === "admin-terminal") {
         if (!actor.terminalId) {
            return NextResponse.json(
               { message: "Terminal tidak ditemukan" },
               { status: 400 },
            );
         }
         query = query.eq("id", actor.terminalId);
      }

      const { data, error: queryError } = await query;
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

export async function POST(request: Request) {
   try {
      const { actor, error } = await requireMasterDataActor();
      if (error) return error;

      if (actor.role !== "staf-iw") {
         return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }

      const body = await request.json();
      const kode = normalizeKode(body?.kode);
      const nama = normalizeNama(body?.nama);

      if (!kode || !nama) {
         return NextResponse.json(
            { message: "Kode dan nama terminal wajib diisi" },
            { status: 400 },
         );
      }

      const adminClient = createAdminClient();
      const { data, error: insertError } = await adminClient
         .from("terminals")
         .insert({ kode, nama })
         .select("id, kode, nama")
         .single();

       if (insertError) {
          return NextResponse.json({ message: insertError.message }, { status: 400 });
       }

       await logActivity(
          "BUAT_TERMINAL",
          `Membuat terminal ${data.kode} — ${data.nama}`,
          { terminal_id: data.id, kode: data.kode, nama: data.nama },
       );

       return NextResponse.json({ data }, { status: 201 });
   } catch (error: unknown) {
      return NextResponse.json(
         { message: error instanceof Error ? error.message : "Internal error" },
         { status: 500 },
      );
   }
}

export async function PATCH(request: Request) {
   try {
      const { actor, error } = await requireMasterDataActor();
      if (error) return error;

      const body = await request.json();
      const id = typeof body?.id === "string" ? body.id.trim() : "";
      const kode = normalizeKode(body?.kode);
      const nama = normalizeNama(body?.nama);

      if (!id || !kode || !nama) {
         return NextResponse.json(
            { message: "ID, kode, dan nama terminal wajib diisi" },
            { status: 400 },
         );
      }

      if (actor.role === "admin-terminal" && id !== actor.terminalId) {
         return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }

      const adminClient = createAdminClient();
      const { data, error: updateError } = await adminClient
         .from("terminals")
         .update({ kode, nama })
         .eq("id", id)
         .select("id, kode, nama")
         .single();

       if (updateError) {
          return NextResponse.json({ message: updateError.message }, { status: 400 });
       }

       await logActivity(
          "UPDATE_TERMINAL",
          `Memperbarui terminal ${data.kode} — ${data.nama}`,
          { terminal_id: data.id, kode: data.kode, nama: data.nama },
       );

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
      const { actor, error } = await requireMasterDataActor();
      if (error) return error;

      if (actor.role !== "staf-iw") {
         return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }

      const url = new URL(request.url);
      const id = url.searchParams.get("id")?.trim();

      if (!id) {
         return NextResponse.json(
            { message: "ID terminal wajib diisi" },
            { status: 400 },
         );
      }

      const adminClient = createAdminClient();
      const { error: deleteError } = await adminClient
         .from("terminals")
         .delete()
         .eq("id", id);

       if (deleteError) {
          return NextResponse.json({ message: deleteError.message }, { status: 400 });
       }

       await logActivity(
          "HAPUS_TERMINAL",
          `Menghapus terminal ${id}`,
          { terminal_id: id },
       );

       return NextResponse.json({ ok: true });
   } catch (error: unknown) {
      return NextResponse.json(
         { message: error instanceof Error ? error.message : "Internal error" },
         { status: 500 },
      );
   }
}
