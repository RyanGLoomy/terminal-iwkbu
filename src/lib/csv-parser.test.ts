import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * Tests for the CSV parser logic used in /api/po/armada/import.
 * The parser is defined inline in the route handler, so we test
 * the same algorithm here to verify correctness.
 */

function parseCsv(text: string): Record<string, string>[] {
   const lines = text
      .replace(/\r\n/g, "\n")
      .split("\n")
      .filter((l) => l.trim().length > 0);
   if (lines.length < 2) return [];

   const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
         const ch = line[i];
         if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
               current += '"';
               i++;
            } else {
               inQuotes = !inQuotes;
            }
         } else if (ch === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
         } else {
            current += ch;
         }
      }
      result.push(current.trim());
      return result;
   };

   const headers = parseLine(lines[0]).map((h) =>
      h.toLowerCase().replace(/\s+/g, "_"),
   );
   const rows: Record<string, string>[] = [];
   for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
         row[h] = values[idx] ?? "";
      });
      rows.push(row);
   }
   return rows;
}

test("CSV parser: basic dengan header + 2 baris", () => {
   const csv = "nomor_polisi,merk,tipe\nB 1234 CD,Toyota,Coaster\nB 5678 EF,Hino,RD";
   const rows = parseCsv(csv);
   assert.equal(rows.length, 2);
   assert.equal(rows[0].nomor_polisi, "B 1234 CD");
   assert.equal(rows[0].merk, "Toyota");
   assert.equal(rows[1].tipe, "RD");
});

test("CSV parser: quoted field dengan koma di dalamnya", () => {
   const csv = 'nomor_polisi,merk\n"BM 1234 AB","Mercedes, Benz"';
   const rows = parseCsv(csv);
   assert.equal(rows.length, 1);
   assert.equal(rows[0].merk, "Mercedes, Benz");
});

test("CSV parser: header di-normalisasi (spasi → underscore, lowercase)", () => {
   const csv = "Nomor Polisi,Tahun Pembuatan\nB 1234,2020";
   const rows = parseCsv(csv);
   assert.equal(rows[0].nomor_polisi, "B 1234");
   assert.equal(rows[0].tahun_pembuatan, "2020");
});

test("CSV parser: kolom kosong", () => {
   const csv = "nomor_polisi,merk,tipe\nB 1234 CD,,Coaster";
   const rows = parseCsv(csv);
   assert.equal(rows[0].merk, "");
   assert.equal(rows[0].tipe, "Coaster");
});

test("CSV parser: escaped double-quote dalam quoted field", () => {
   const csv = 'nomor_polisi,merk\n"B 1234","Bus ""Eksekutif"""';
   const rows = parseCsv(csv);
   assert.equal(rows[0].merk, 'Bus "Eksekutif"');
});

test("CSV parser: empty input → empty array", () => {
   assert.deepEqual(parseCsv(""), []);
   assert.deepEqual(parseCsv("nomor_polisi"), []);
});

test("CSV parser: CRLF line endings", () => {
   const csv = "nomor_polisi,merk\r\nB 1234 CD,Toyota\r\n";
   const rows = parseCsv(csv);
   assert.equal(rows.length, 1);
   assert.equal(rows[0].nomor_polisi, "B 1234 CD");
});

test("CSV parser: trailing whitespace di-trim", () => {
   const csv = "nomor_polisi,merk\n  B 1234 CD  ,  Toyota  ";
   const rows = parseCsv(csv);
   assert.equal(rows[0].nomor_polisi, "B 1234 CD");
   assert.equal(rows[0].merk, "Toyota");
});

test("CSV parser: extra kolom (lebih banyak value dari header)", () => {
   const csv = "nomor_polisi,merk\nB 1234,Toyota,Extra";
   const rows = parseCsv(csv);
   assert.equal(rows.length, 1);
   assert.equal(rows[0].nomor_polisi, "B 1234");
});

test("CSV parser: kurang kolom (lebih sedikit value dari header)", () => {
   const csv = "nomor_polisi,merk,tipe\nB 1234,Toyota";
   const rows = parseCsv(csv);
   assert.equal(rows[0].tipe, "");
});
