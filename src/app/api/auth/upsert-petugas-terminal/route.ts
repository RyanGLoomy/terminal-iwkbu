import { randomInt } from "crypto";
import { sanitizeDbError } from "@/lib/db-error";
import { NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { ensureRoleOrThrow } from "@/lib/auth/requireRole.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/supabase/queries/operasional.server";
import bcrypt from "bcryptjs";

function generatePin(): string {
   return String(randomInt(1000, 10000));
}

function normalizeText(value: unknown) {
   return typeof value === "string" ? value.trim() : "";
}

function resolveTerminalId(params: {
   actorRole: string;
   actorTerminalId?: string | null;
   requestedTerminalId: string;
}) {
   if (params.actorRole === "admin-terminal") {
      if (!params.actorTerminalId) {
         return { message: "Terminal tidak ditemukan pada profil." } as const;
      }

      if (params.requestedTerminalId !== params.actorTerminalId) {
         return { message: "Forbidden", status: 403 } as const;
      }
   }

   return { terminalId: params.requestedTerminalId } as const;
}

async function pinExists(params: {
   rows: Array<{ id: string; pin_hash: string | null }>;
   pin: string;
   currentPetugasId?: string;
}) {
   for (const row of params.rows) {
      if (row.id === params.currentPetugasId || !row.pin_hash) continue;
      if (bcrypt.compareSync(params.pin, row.pin_hash)) return true;
   }

   return false;
}

export async function POST(request: Request) {
   try {
      const actor = await getAuthenticatedActor();
      if (!actor) {
         return NextResponse.json(
            { message: "Sesi habis. Silakan login ulang." },
            { status: 401 },
         );
      }

      let role: string;
      try {
         role = ensureRoleOrThrow(actor.user, actor.profile, [
            "admin-terminal",
            "staf-iw",
         ]).role;
      } catch (err: unknown) {
         return NextResponse.json(
            { message: err instanceof Error ? err.message : "Forbidden" },
            { status: (err as { status?: number })?.status ?? 403 },
         );
      }

      const body = await request.json().catch(() => null);
      const requestedTerminalId = normalizeText(body?.terminal_id);
      const nama = normalizeText(body?.nama);
      const pin = normalizeText(body?.pin);
      const petugasId = normalizeText(body?.petugas_id) || undefined;

      if (!requestedTerminalId || !nama) {
         return NextResponse.json(
            { message: "terminal_id dan nama wajib diisi." },
            { status: 400 },
         );
      }

      if (pin && !/^\d{4,6}$/.test(pin)) {
         return NextResponse.json(
            { message: "PIN harus 4-6 digit angka." },
            { status: 400 },
         );
      }

      const terminalResult = resolveTerminalId({
         actorRole: role,
         actorTerminalId: actor.terminalId,
         requestedTerminalId,
      });

      if ("message" in terminalResult) {
         return NextResponse.json(
            { message: terminalResult.message },
            { status: terminalResult.status ?? 400 },
         );
      }

      const adminClient = createAdminClient();

      if (petugasId) {
         const { data: existingPetugas, error: existingPetugasError } =
            await adminClient
               .from("petugas_terminal")
               .select("id, terminal_id, pin_hash")
               .eq("id", petugasId)
               .maybeSingle();

         if (existingPetugasError) {
            return NextResponse.json(
               { message: existingPetugasError.message },
               { status: 500 },
            );
         }

         if (!existingPetugas) {
            return NextResponse.json(
               { message: "Petugas tidak ditemukan." },
               { status: 404 },
            );
         }

         if (existingPetugas.terminal_id !== terminalResult.terminalId) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
         }
      }

      const { data: existingPins, error: existingPinsError } = await adminClient
         .from("petugas_terminal")
         .select("id, pin_hash")
         .eq("terminal_id", terminalResult.terminalId);

      if (existingPinsError) {
         return NextResponse.json(
            { message: existingPinsError.message },
            { status: 500 },
         );
      }

      let finalPin = pin;
      if (finalPin) {
         const duplicate = await pinExists({
            rows: existingPins ?? [],
            pin: finalPin,
            currentPetugasId: petugasId,
         });

         if (duplicate) {
            return NextResponse.json(
               { message: "PIN sudah digunakan petugas lain." },
               { status: 400 },
            );
         }
      }

      if (!finalPin && !petugasId) {
         let attempts = 0;
         do {
            finalPin = generatePin();
            const duplicate = await pinExists({
               rows: existingPins ?? [],
               pin: finalPin,
            });
            if (!duplicate) break;
            attempts += 1;
         } while (attempts < 20);

         if (attempts >= 20) {
            return NextResponse.json(
               { message: "Gagal menghasilkan PIN unik." },
               { status: 500 },
            );
         }
      }

      const payload: Record<string, string | boolean> = {
         terminal_id: terminalResult.terminalId,
         nama,
      };
      if (!petugasId) payload.is_active = true;
      if (finalPin) payload.pin_hash = bcrypt.hashSync(finalPin, 10);

      const query = petugasId
         ? adminClient
              .from("petugas_terminal")
              .update(payload)
              .eq("id", petugasId)
              .select("id")
              .single()
         : adminClient
              .from("petugas_terminal")
              .insert(payload)
              .select("id")
              .single();

      const { data, error } = await query;

      if (error) {
         return NextResponse.json({ message: sanitizeDbError(error) }, { status: 500 });
      }

      if (finalPin) {
         await logActivity(
            "SET_PIN",
            petugasId
               ? "Memperbarui PIN petugas terminal"
               : "Membuat PIN petugas terminal",
            {
               terminal_id: terminalResult.terminalId,
               petugas_terminal_id: data.id,
               mode: petugasId ? "update" : "create",
            },
         );
      }

      return NextResponse.json({ id: data.id, pin: finalPin || undefined });
   } catch (error: unknown) {
      return NextResponse.json(
         { message: error instanceof Error ? error.message : "Terjadi kesalahan." },
         { status: 500 },
      );
   }
}
