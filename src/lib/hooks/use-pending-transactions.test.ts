import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * Tests for the pending transaction queue logic used in
 * src/lib/hooks/use-pending-transactions.ts.
 *
 * The hook itself uses React state + browser APIs (localStorage, navigator),
 * so we test the queue management functions in isolation.
 */

interface PendingTransaction {
   id: string;
   type: "masuk" | "keluar";
   data: Record<string, unknown>;
   timestamp: number;
}

// Re-implement the queue functions for testing (same logic as the hook)
function sortQueue(items: PendingTransaction[]): PendingTransaction[] {
   return [...items].sort((a, b) => a.timestamp - b.timestamp);
}

function removeById(items: PendingTransaction[], id: string): PendingTransaction[] {
   return items.filter((t) => t.id !== id);
}

function dedupeById(items: PendingTransaction[]): PendingTransaction[] {
   const seen = new Set<string>();
   return items.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
   });
}

function validateTransaction(tx: unknown): tx is PendingTransaction {
   if (!tx || typeof tx !== "object") return false;
   const t = tx as Record<string, unknown>;
   return (
      typeof t.id === "string" &&
      (t.type === "masuk" || t.type === "keluar") &&
      typeof t.data === "object" &&
      typeof t.timestamp === "number"
   );
}

test("sortQueue: urut berdasarkan timestamp (FIFO)", () => {
   const items = [
      { id: "3", type: "masuk" as const, data: {}, timestamp: 300 },
      { id: "1", type: "masuk" as const, data: {}, timestamp: 100 },
      { id: "2", type: "keluar" as const, data: {}, timestamp: 200 },
   ];
   const sorted = sortQueue(items);
   assert.equal(sorted[0].id, "1");
   assert.equal(sorted[1].id, "2");
   assert.equal(sorted[2].id, "3");
});

test("sortQueue: tidak mutate array asli", () => {
   const items = [
      { id: "2", type: "masuk" as const, data: {}, timestamp: 200 },
      { id: "1", type: "masuk" as const, data: {}, timestamp: 100 },
   ];
   const sorted = sortQueue(items);
   assert.equal(items[0].id, "2"); // original unchanged
   assert.equal(sorted[0].id, "1"); // sorted copy
});

test("removeById: hapus berdasarkan ID", () => {
   const items = [
      { id: "a", type: "masuk" as const, data: {}, timestamp: 1 },
      { id: "b", type: "keluar" as const, data: {}, timestamp: 2 },
      { id: "c", type: "masuk" as const, data: {}, timestamp: 3 },
   ];
   const result = removeById(items, "b");
   assert.equal(result.length, 2);
   assert.equal(result[0].id, "a");
   assert.equal(result[1].id, "c");
});

test("removeById: ID tidak ditemukan → array tidak berubah", () => {
   const items = [
      { id: "a", type: "masuk" as const, data: {}, timestamp: 1 },
   ];
   const result = removeById(items, "nonexistent");
   assert.equal(result.length, 1);
});

test("dedupeById: hapus duplikat berdasarkan ID", () => {
   const items = [
      { id: "a", type: "masuk" as const, data: {}, timestamp: 1 },
      { id: "a", type: "masuk" as const, data: {}, timestamp: 2 },
      { id: "b", type: "keluar" as const, data: {}, timestamp: 3 },
   ];
   const result = dedupeById(items);
   assert.equal(result.length, 2);
   assert.equal(result[0].id, "a");
   assert.equal(result[1].id, "b");
});

test("validateTransaction: valid masuk", () => {
   const tx = { id: "abc", type: "masuk", data: { nopol: "B 123" }, timestamp: Date.now() };
   assert.equal(validateTransaction(tx), true);
});

test("validateTransaction: valid keluar", () => {
   const tx = { id: "xyz", type: "keluar", data: { id: "123" }, timestamp: Date.now() };
   assert.equal(validateTransaction(tx), true);
});

test("validateTransaction: invalid type", () => {
   const tx = { id: "abc", type: "invalid", data: {}, timestamp: 1 };
   assert.equal(validateTransaction(tx), false);
});

test("validateTransaction: missing id", () => {
   const tx = { type: "masuk", data: {}, timestamp: 1 };
   assert.equal(validateTransaction(tx), false);
});

test("validateTransaction: null input", () => {
   assert.equal(validateTransaction(null), false);
   assert.equal(validateTransaction(undefined), false);
   assert.equal(validateTransaction("string"), false);
});
