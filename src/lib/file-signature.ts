/**
 * Deteksi MIME dari magic number (signature bytes) konten file, BUKAN dari
 * `File.type` / `Content-Type` yang sepenuhnya dikendalikan klien (APP-04).
 *
 * Hanya 4 tipe yang didukung — cocok dengan allowlist upload evidence &
 * dokumen armada (PDF/JPEG/PNG/WebP). Mengembalikan null bila signature tidak
 * dikenali; pemanggil wajib menolak upload dalam kasus itu.
 */
export function detectMimeType(buf: Buffer): string | null {
   if (buf.length < 12) return null;

   // PDF: %PDF- (25 50 44 46 2D)
   if (
      buf[0] === 0x25 &&
      buf[1] === 0x50 &&
      buf[2] === 0x44 &&
      buf[3] === 0x46
   ) {
      return "application/pdf";
   }

   // JPEG: FF D8 FF
   if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return "image/jpeg";
   }

   // PNG: 89 50 4E 47 0D 0A 1A 0A
   if (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
   ) {
      return "image/png";
   }

   // WebP: RIFF....WEBP
   if (
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
   ) {
      return "image/webp";
   }

   return null;
}
