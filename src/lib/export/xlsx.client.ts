export type XlsxCell = string | number | boolean | Date | null | undefined;

export type XlsxSheet = {
   name: string;
   rows: XlsxCell[][];
};

type ZipEntry = {
   path: string;
   content: Uint8Array;
};

const textEncoder = new TextEncoder();
const XLSX_TYPE =
   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ZIP_DOS_TIME = 0;
const ZIP_DOS_DATE = (1 << 5) | 1;

let crcTable: Uint32Array | null = null;

function encodeText(value: string) {
   return textEncoder.encode(value);
}

function escapeXml(value: string) {
   return value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
}

function columnName(index: number) {
   let name = "";
   let current = index + 1;

   while (current > 0) {
      const remainder = (current - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      current = Math.floor((current - 1) / 26);
   }

   return name;
}

function normalizeSheetNames(sheets: XlsxSheet[]) {
   const used = new Set<string>();

   return sheets.map((sheet, index) => {
      const base =
         sheet.name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) ||
         `Sheet ${index + 1}`;
      let name = base;
      let suffix = 2;

      while (used.has(name.toLowerCase())) {
         const marker = ` ${suffix}`;
         name = `${base.slice(0, 31 - marker.length)}${marker}`;
         suffix += 1;
      }

      used.add(name.toLowerCase());
      return name;
   });
}

function cellToXml(value: XlsxCell, rowIndex: number, columnIndex: number) {
   if (value === null || value === undefined || value === "") return "";

   const ref = `${columnName(columnIndex)}${rowIndex + 1}`;

   if (typeof value === "number" && Number.isFinite(value)) {
      return `<c r="${ref}"><v>${value}</v></c>`;
   }

   if (typeof value === "boolean") {
      return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
   }

   const text = value instanceof Date ? value.toISOString() : String(value);
   return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(text)}</t></is></c>`;
}

function sheetXml(rows: XlsxCell[][]) {
   const rowXml = rows
      .map((row, rowIndex) => {
         const cells = row
            .map((cell, columnIndex) => cellToXml(cell, rowIndex, columnIndex))
            .join("");

         return cells ? `<row r="${rowIndex + 1}">${cells}</row>` : "";
      })
      .join("");

   return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`;
}

function contentTypesXml(sheetCount: number) {
   const sheetTypes = Array.from(
      { length: sheetCount },
      (_, index) =>
         `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
   ).join("");

   return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetTypes}</Types>`;
}

function workbookXml(sheetNames: string[]) {
   const sheets = sheetNames
      .map(
         (name, index) =>
            `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
      )
      .join("");

   return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets}</sheets></workbook>`;
}

function workbookRelsXml(sheetCount: number) {
   const relationships = Array.from(
      { length: sheetCount },
      (_, index) =>
         `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
   ).join("");

   return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`;
}

function rootRelsXml() {
   return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
}

function getCrcTable() {
   if (crcTable) return crcTable;

   const table = new Uint32Array(256);

   for (let index = 0; index < 256; index += 1) {
      let value = index;

      for (let bit = 0; bit < 8; bit += 1) {
         value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }

      table[index] = value >>> 0;
   }

   crcTable = table;
   return table;
}

function crc32(bytes: Uint8Array) {
   const table = getCrcTable();
   let crc = 0xffffffff;

   for (const byte of bytes) {
      crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
   }

   return (crc ^ 0xffffffff) >>> 0;
}

function header(length: number, writer: (view: DataView) => void) {
   const bytes = new Uint8Array(length);
   writer(new DataView(bytes.buffer));
   return bytes;
}

function concat(parts: Uint8Array[]) {
   const totalLength = parts.reduce((total, part) => total + part.length, 0);
   const bytes = new Uint8Array(totalLength);
   let offset = 0;

   for (const part of parts) {
      bytes.set(part, offset);
      offset += part.length;
   }

   return bytes;
}

function zip(entries: ZipEntry[]) {
   const localParts: Uint8Array[] = [];
   const centralParts: Uint8Array[] = [];
   let offset = 0;

   for (const entry of entries) {
      const name = encodeText(entry.path);
      const crc = crc32(entry.content);
      const size = entry.content.length;

      const localHeader = header(30, (view) => {
         view.setUint32(0, 0x04034b50, true);
         view.setUint16(4, 20, true);
         view.setUint16(6, 0x0800, true);
         view.setUint16(8, 0, true);
         view.setUint16(10, ZIP_DOS_TIME, true);
         view.setUint16(12, ZIP_DOS_DATE, true);
         view.setUint32(14, crc, true);
         view.setUint32(18, size, true);
         view.setUint32(22, size, true);
         view.setUint16(26, name.length, true);
         view.setUint16(28, 0, true);
      });

      localParts.push(localHeader, name, entry.content);

      const centralHeader = header(46, (view) => {
         view.setUint32(0, 0x02014b50, true);
         view.setUint16(4, 20, true);
         view.setUint16(6, 20, true);
         view.setUint16(8, 0x0800, true);
         view.setUint16(10, 0, true);
         view.setUint16(12, ZIP_DOS_TIME, true);
         view.setUint16(14, ZIP_DOS_DATE, true);
         view.setUint32(16, crc, true);
         view.setUint32(20, size, true);
         view.setUint32(24, size, true);
         view.setUint16(28, name.length, true);
         view.setUint16(30, 0, true);
         view.setUint16(32, 0, true);
         view.setUint16(34, 0, true);
         view.setUint16(36, 0, true);
         view.setUint32(38, 0, true);
         view.setUint32(42, offset, true);
      });

      centralParts.push(centralHeader, name);
      offset += localHeader.length + name.length + entry.content.length;
   }

   const centralDirectory = concat(centralParts);
   const endOfCentralDirectory = header(22, (view) => {
      view.setUint32(0, 0x06054b50, true);
      view.setUint16(4, 0, true);
      view.setUint16(6, 0, true);
      view.setUint16(8, entries.length, true);
      view.setUint16(10, entries.length, true);
      view.setUint32(12, centralDirectory.length, true);
      view.setUint32(16, offset, true);
      view.setUint16(20, 0, true);
   });

   return concat([...localParts, centralDirectory, endOfCentralDirectory]);
}

function workbookEntries(sheets: XlsxSheet[]) {
   const sheetNames = normalizeSheetNames(sheets);
   const entries: ZipEntry[] = [
      {
         path: "[Content_Types].xml",
         content: encodeText(contentTypesXml(sheets.length)),
      },
      { path: "_rels/.rels", content: encodeText(rootRelsXml()) },
      { path: "xl/workbook.xml", content: encodeText(workbookXml(sheetNames)) },
      {
         path: "xl/_rels/workbook.xml.rels",
         content: encodeText(workbookRelsXml(sheets.length)),
      },
   ];

   sheets.forEach((sheet, index) => {
      entries.push({
         path: `xl/worksheets/sheet${index + 1}.xml`,
         content: encodeText(sheetXml(sheet.rows)),
      });
   });

   return entries;
}

function downloadBlob(filename: string, blob: Blob) {
   const url = URL.createObjectURL(blob);
   const anchor = document.createElement("a");
   anchor.href = url;
   anchor.download = filename;
   anchor.click();
   URL.revokeObjectURL(url);
}

export async function exportXlsx(filename: string, sheets: XlsxSheet[]) {
   if (sheets.length === 0) return;

   // Buat arsip XLSX minimal lokal agar tidak membawa parser SheetJS yang rentan.
   downloadBlob(
      filename,
      new Blob([zip(workbookEntries(sheets))], { type: XLSX_TYPE }),
   );
}
