#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = resolve(__dirname, "../.env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const CREDENTIALS_PATH = "/tmp/opencode/iwkbu-test-credentials.json";

const TEST_ACCOUNTS = [
  { email: "test.po.iwkbu@example.com", password: "Tmp-IWKBU-PO-2026", role: "po", fullName: "PO Demo Playwright" },
  { email: "test.loket.iwkbu@example.com", password: "Tmp-IWKBU-Loket-2026", role: "loket", fullName: "Loket Demo Playwright", terminalKode: "TST01", pin: "123456" },
  { email: "test.admin-terminal.iwkbu@example.com", password: "Tmp-IWKBU-Admin-2026", role: "admin-terminal", fullName: "Admin Terminal Demo Playwright", terminalKode: "TST01" },
  { email: "test.staf-iw.iwkbu@example.com", password: "Tmp-IWKBU-Staf-2026", role: "staf-iw", fullName: "Staf IW Demo Playwright" },
];

async function ensureRole(supabase, name) {
  const { data } = await supabase.from("roles").select("id").eq("name", name).maybeSingle();
  if (data) return data.id;
  const { data: inserted } = await supabase.from("roles").insert({ name }).select("id").single();
  return inserted.id;
}

async function ensureTerminal(supabase, kode) {
  const { data } = await supabase.from("terminals").select("id").eq("kode", kode).maybeSingle();
  if (data) return data.id;
  const { data: inserted } = await supabase.from("terminals").insert({ kode, nama: `Terminal ${kode}` }).select("id").single();
  return inserted.id;
}

async function ensureUser(supabase, account, roleId, terminalId) {
  let userId;

  const { data: { users } } = await supabase.auth.admin.listUsers();
  const existing = users?.find((u) => u.email === account.email);
  if (existing) {
    userId = existing.id;
    await supabase.auth.admin.updateUserById(userId, {
      password: account.password,
      user_metadata: { full_name: account.fullName, role: account.role },
      email_confirm: true,
    });
  } else {
    const { data: created } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { full_name: account.fullName, role: account.role },
    });
    userId = created?.user?.id;
  }

  if (!userId) throw new Error(`Failed: ${account.email}`);

  await supabase.from("profiles").upsert(
    { id: userId, email: account.email, full_name: account.fullName, terminal_id: terminalId ?? null, is_active: true },
    { onConflict: "id" },
  );

  await supabase.from("user_roles").upsert(
    { user_id: userId, role_id: roleId },
    { onConflict: "user_id,role_id" },
  );

  return userId;
}

async function ensurePetugasTerminal(supabase, terminalId, nama, pin) {
  const pinHash = bcrypt.hashSync(pin, 10);
  const { data: existing } = await supabase.from("petugas_terminal").select("id").eq("terminal_id", terminalId).eq("nama", nama).maybeSingle();
  if (existing) {
    await supabase.from("petugas_terminal").update({ pin_hash: pinHash, is_active: true }).eq("id", existing.id);
    return existing.id;
  }
  const { data: inserted } = await supabase.from("petugas_terminal").insert({ terminal_id: terminalId, nama, pin_hash: pinHash, is_active: true }).select("id").single();
  return inserted.id;
}

async function ensurePinSession(supabase, userId, petugasTerminalId, petugasNama) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  await supabase.from("petugas_pin_sessions").upsert(
    { user_id: userId, verified_at: now.toISOString(), expires_at: expiresAt.toISOString(), updated_at: now.toISOString(), petugas_terminal_id: petugasTerminalId, petugas_nama: petugasNama },
    { onConflict: "user_id" },
  );
}

async function ensurePO(supabase, userId) {
  const { data: existing } = await supabase.from("po").select("id").eq("id", userId).maybeSingle();
  if (existing) return;
  await supabase.from("po").insert({ id: userId, kode_po: "POTST", nama_perusahaan: "PT PO Demo Playwright", alamat: "Jl. Test No. 1", status_verifikasi: "aktif" });
}

async function ensureArmada(supabase, poUserId) {
  const { data: existing } = await supabase.from("armada").select("id").eq("po_id", poUserId).limit(1);
  if (existing && existing.length > 0) return;
  await supabase.from("armada").insert([
    { po_id: poUserId, nomor_polisi: "B 1234 CD", nomor_uji: "1234/5678", status_operasional: "aktif", status_verifikasi: "terverifikasi" },
    { po_id: poUserId, nomor_polisi: "B 5678 EF", nomor_uji: "9012/3456", status_operasional: "aktif", status_verifikasi: "terverifikasi" },
    { po_id: poUserId, nomor_polisi: "B 9012 GH", nomor_uji: "7890/1234", status_operasional: "nonaktif", status_verifikasi: "menunggu" },
  ]);
}

async function main() {
  console.log("\n=== Setup E2E Test Data ===\n");

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const roleIds = {};
  for (const role of ["po", "loket", "admin-terminal", "staf-iw"]) {
    roleIds[role] = await ensureRole(supabase, role);
    console.log(`  ✓ Role "${role}" ready`);
  }

  const terminalId = await ensureTerminal(supabase, "TST01");
  console.log(`  ✓ Terminal "TST01" ready`);

  let petugasTerminalId;

  for (const account of TEST_ACCOUNTS) {
    const tId = account.terminalKode ? terminalId : undefined;
    const userId = await ensureUser(supabase, account, roleIds[account.role], tId);
    console.log(`  ✓ User "${account.email}" (${account.role}) ready`);

    if (account.role === "po") {
      await ensurePO(supabase, userId);
      await ensureArmada(supabase, userId);
      console.log(`  ✓ PO + Armada data seeded`);
    }

    if (account.role === "loket" && account.pin && tId) {
      petugasTerminalId = await ensurePetugasTerminal(supabase, tId, account.fullName, account.pin);
      await ensurePinSession(supabase, userId, petugasTerminalId, account.fullName);
      console.log(`  ✓ PIN session created (PIN: ${account.pin})`);
    }
  }

  const creds = TEST_ACCOUNTS.map((a) => ({
    email: a.email, password: a.password, role: a.role, fullName: a.fullName,
    ...(a.pin ? { pin: a.pin } : {}),
  }));

  mkdirSync(dirname(CREDENTIALS_PATH), { recursive: true });
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2), "utf-8");
  chmodSync(CREDENTIALS_PATH, 0o600);

  console.log(`\n✓ ${TEST_ACCOUNTS.length} test accounts ready`);
  console.log(`✓ Credentials: ${CREDENTIALS_PATH}`);
  console.log();

  process.env.E2E_TERMINAL_ID = terminalId;
  if (petugasTerminalId) process.env.E2E_PETUGAS_TERMINAL_ID = petugasTerminalId;
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
