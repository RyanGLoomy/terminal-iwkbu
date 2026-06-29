import { test } from "node:test";
import assert from "node:assert/strict";

import {
   reconcile,
   normalizePlate,
   type ArmadaRecord,
   type SourceRecord,
} from "./engine";

function armada(over: Partial<ArmadaRecord> = {}): ArmadaRecord {
   return {
      id: "a1",
      po_id: "po1",
      nomor_polisi: "B 1234 CD",
      status_verifikasi: "terverifikasi",
      status_operasional: "aktif",
      po: { status_verifikasi: "aktif", kode_po: "PO-X", nama_perusahaan: "PO X" },
      ...over,
   };
}

function compliantSource(plate = "B 1234 CD"): SourceRecord {
   return {
      nomor_polisi: plate,
      compliance_status: "compliant",
      issue_count: 0,
      source_updated_at: "2026-06-28T00:00:00Z",
      payload: {},
   };
}

test("compliant armada + semua valid -> ready, tidak ada finding", () => {
   const a = armada();
   const { rows, findings } = reconcile({
      armada: [a],
      sourceByPlate: new Map([[normalizePlate(a.nomor_polisi), compliantSource()]]),
   });
   assert.equal(rows.length, 1);
   assert.equal(rows[0].reconciliation_status, "ready");
   assert.equal(findings.length, 0);
});

test("non_compliant -> blocked, 1 finding severity high", () => {
   const a = armada();
   const src = compliantSource();
   src.compliance_status = "non_compliant";
   src.issue_count = 3;
   const { rows, findings } = reconcile({
      armada: [a],
      sourceByPlate: new Map([[normalizePlate(a.nomor_polisi), src]]),
   });
   assert.equal(rows[0].reconciliation_status, "blocked");
   assert.equal(findings.length, 1);
   assert.equal(findings[0].severity, "high");
   assert.equal(findings[0].source_type, "rekonsiliasi");
   assert.equal(findings[0].armada_id, a.id);
   assert.equal(findings[0].po_id, a.po_id);
});

test("source hilang -> needs_review, 1 finding severity medium", () => {
   const a = armada();
   const { findings } = reconcile({ armada: [a], sourceByPlate: new Map() });
   assert.equal(findings.length, 1);
   assert.equal(findings[0].severity, "medium");
   assert.match(findings[0].deskripsi, /data IWKBU belum tersedia/);
});

test("PO belum aktif -> blocked severity high", () => {
   const a = armada({ po: { status_verifikasi: "menunggu", kode_po: "PO-X", nama_perusahaan: "PO X" } });
   const { rows, findings } = reconcile({
      armada: [a],
      sourceByPlate: new Map([[normalizePlate(a.nomor_polisi), compliantSource()]]),
   });
   assert.equal(rows[0].reconciliation_status, "blocked");
   assert.equal(findings[0].severity, "high");
});

test("pending IWKBU -> needs_review severity medium", () => {
   const a = armada();
   const src = compliantSource();
   src.compliance_status = "pending";
   const { rows, findings } = reconcile({
      armada: [a],
      sourceByPlate: new Map([[normalizePlate(a.nomor_polisi), src]]),
   });
   assert.equal(rows[0].reconciliation_status, "needs_review");
   assert.equal(findings[0].severity, "medium");
});

test("normalizePlate konsisten: spasi/case di-normalisasi", () => {
   assert.equal(normalizePlate("b 1234 cd"), "B1234CD");
   assert.equal(normalizePlate("  B  1234  CD "), "B1234CD");
   assert.equal(normalizePlate(null), "");
   // join harus cocok walau input beda format
   const a = armada({ nomor_polisi: "b 1234 cd" });
   const { rows } = reconcile({
      armada: [a],
      sourceByPlate: new Map([[normalizePlate("B1234CD"), compliantSource("B1234CD")]]),
   });
   assert.equal(rows[0].iwkbu_compliance_status, "compliant");
   assert.equal(rows[0].reconciliation_status, "ready");
});

test("beberapa armada: jumlah finding akurat", () => {
   const ok = armada({ id: "ok", nomor_polisi: "B 1" });
   const bad = armada({ id: "bad", nomor_polisi: "B 2" });
   const srcBad = compliantSource("B 2");
   srcBad.compliance_status = "non_compliant";
   const { rows, findings } = reconcile({
      armada: [ok, bad],
      sourceByPlate: new Map([
         [normalizePlate("B 1"), compliantSource("B 1")],
         [normalizePlate("B 2"), srcBad],
      ]),
   });
   assert.equal(rows.length, 2);
   assert.equal(findings.length, 1);
   assert.equal(findings[0].armada_id, "bad");
});

test("terminalLastSeen diteruskan ke row", () => {
   const a = armada();
   const { rows } = reconcile({
      armada: [a],
      sourceByPlate: new Map([[normalizePlate(a.nomor_polisi), compliantSource()]]),
      terminalLastSeen: new Map([[a.id, "2026-06-28T12:00:00Z"]]),
   });
   assert.equal(rows[0].terminal_last_seen, "2026-06-28T12:00:00Z");
});
