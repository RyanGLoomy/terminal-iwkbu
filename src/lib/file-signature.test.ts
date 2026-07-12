import { test } from "node:test";
import assert from "node:assert/strict";

import { detectMimeType } from "./file-signature";

test("detectMimeType: PDF signature", () => {
   // %PDF- (25 50 44 46 2D)
   const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0, 0, 0, 0, 0, 0]);
   assert.equal(detectMimeType(buf), "application/pdf");
});

test("detectMimeType: JPEG signature", () => {
   // FF D8 FF
   const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
   assert.equal(detectMimeType(buf), "image/jpeg");
});

test("detectMimeType: PNG signature", () => {
   // 89 50 4E 47 0D 0A 1A 0A
   const buf = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
   ]);
   assert.equal(detectMimeType(buf), "image/png");
});

test("detectMimeType: WebP signature (RIFF....WEBP)", () => {
   const buf = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
   ]);
   assert.equal(detectMimeType(buf), "image/webp");
});

test("detectMimeType: RIFF tanpa WEBP (mis. WAV) -> null", () => {
   // RIFF....WAVE
   const buf = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45,
   ]);
   assert.equal(detectMimeType(buf), null);
});

test("detectMimeType: buffer terlalu pendek (< 12 byte) -> null", () => {
   assert.equal(detectMimeType(Buffer.from([0x89, 0x50, 0x4e, 0x47])), null);
   assert.equal(detectMimeType(Buffer.alloc(0)), null);
   assert.equal(detectMimeType(Buffer.alloc(11)), null);
});

test("detectMimeType: persis 12 byte valid -> terdeteksi", () => {
   // WebP dengan ukuran tepat 12 byte (MIN_HEADER_LEN)
   const buf = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
   ]);
   assert.equal(buf.length, 12);
   assert.equal(detectMimeType(buf), "image/webp");
});

test("detectMimeType: signature tidak dikenal -> null", () => {
   assert.equal(detectMimeType(Buffer.from("Hello World!")), null);
});
