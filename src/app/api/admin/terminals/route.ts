import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeDbError } from "@/lib/db-error";
import { requireActor, actorErrorHandler } from "@/lib/auth/actor";
import { ROLES } from "@/config/roles";
import { logActivity } from "@/lib/supabase/queries/operasional.server";

function normalizeKode(value: unknown) {
   return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function normalizeNama(value: unknown) {
   return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
   try {
      const actor = await requireActor([ROLES.ADMIN_TERMINAL, ROLES.STAF_IW]);

      const adminClient = createAdminClient();
      let query = adminClient
         .from("terminals")
         .select("id, kode, nama")
         .order("nama", { ascending: true });

      if (actor.role === ROLES.ADMIN_TERMINAL) {
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
         return NextResponse.json({ message: sanitizeDbError(queryError, "terminals list") }, { status: 500 });
      }

      return NextResponse.json({ data: data ?? [] });
   } catch (error) {
      return actorErrorHandler(error);
   }
}

export async function POST(request: Request) {
   try {
      await requireActor(ROLES.STAF_IW);

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
           return NextResponse.json({ message: sanitizeDbError(insertError, "terminals create") }, { status: 400 });
        }

        await logActivity(
           "BUAT_TERMINAL",
           `Membuat terminal ${data.kode} — ${data.nama}`,
           { terminal_id: data.id, kode: data.kode, nama: data.nama },
        );

        return NextResponse.json({ data }, { status: 201 });
   } catch (error) {
      return actorErrorHandler(error);
   }
}

export async function PATCH(request: Request) {
   try {
      const actor = await requireActor([ROLES.ADMIN_TERMINAL, ROLES.STAF_IW]);

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

      if (actor.role === ROLES.ADMIN_TERMINAL && id !== actor.terminalId) {
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
           return NextResponse.json({ message: sanitizeDbError(updateError, "terminals update") }, { status: 400 });
        }

        await logActivity(
           "UPDATE_TERMINAL",
           `Memperbarui terminal ${data.kode} — ${data.nama}`,
           { terminal_id: data.id, kode: data.kode, nama: data.nama },
        );

        return NextResponse.json({ data });
   } catch (error) {
      return actorErrorHandler(error);
   }
}

export async function DELETE(request: Request) {
   try {
      await requireActor(ROLES.STAF_IW);

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
           return NextResponse.json({ message: sanitizeDbError(deleteError, "terminals delete") }, { status: 400 });
        }

        await logActivity(
           "HAPUS_TERMINAL",
           `Menghapus terminal ${id}`,
           { terminal_id: id },
        );

        return NextResponse.json({ ok: true });
   } catch (error) {
      return actorErrorHandler(error);
   }
}
