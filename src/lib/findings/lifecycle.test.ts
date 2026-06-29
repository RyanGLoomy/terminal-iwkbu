import { test } from "node:test";
import assert from "node:assert/strict";

import { nextStatus, type FindingStatus } from "./lifecycle";

const S = {
   open: "open" as FindingStatus,
   on_progress: "on_progress" as FindingStatus,
   closed: "closed" as FindingStatus,
};

test("po_clarify menerima dari open -> on_progress", () => {
   assert.equal(nextStatus({ from: S.open, event: "po_clarify", decision: "menerima" }), "on_progress");
});

test("po_clarify melengkapi dari on_progress -> on_progress", () => {
   assert.equal(nextStatus({ from: S.on_progress, event: "po_clarify", decision: "melengkapi" }), "on_progress");
});

test("po_clarify menolak -> open (dari open maupun on_progress)", () => {
   assert.equal(nextStatus({ from: S.open, event: "po_clarify", decision: "menolak" }), "open");
   assert.equal(nextStatus({ from: S.on_progress, event: "po_clarify", decision: "menolak" }), "open");
});

test("po_clarify dari closed -> null (invalid -> 409)", () => {
   assert.equal(nextStatus({ from: S.closed, event: "po_clarify", decision: "menerima" }), null);
});

test("staf_clarify dari open -> on_progress", () => {
   assert.equal(nextStatus({ from: S.open, event: "staf_clarify" }), "on_progress");
});

test("staf_clarify dari on_progress -> on_progress", () => {
   assert.equal(nextStatus({ from: S.on_progress, event: "staf_clarify" }), "on_progress");
});

test("staf_clarify dari closed -> null (invalid -> 409)", () => {
   assert.equal(nextStatus({ from: S.closed, event: "staf_clarify" }), null);
});

test("staf_close -> closed", () => {
   assert.equal(nextStatus({ from: S.open, event: "staf_close" }), "closed");
   assert.equal(nextStatus({ from: S.on_progress, event: "staf_close" }), "closed");
});

test("staf_reopen -> open", () => {
   assert.equal(nextStatus({ from: S.closed, event: "staf_reopen" }), "open");
});

test("FindingClosedError guard: semua event clarify di-block saat closed", () => {
   // dokumentasi: clarifikasi tak boleh pada temuan tertutup
   for (const event of ["po_clarify", "staf_clarify"] as const) {
      assert.equal(nextStatus({ from: S.closed, event }), null);
   }
});
