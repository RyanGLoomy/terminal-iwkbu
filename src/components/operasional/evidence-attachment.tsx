"use client";

import { useState } from "react";
import { Paperclip, ExternalLink, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EvidenceAttachmentProps {
   evidence: Record<string, unknown>;
}

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp"]);

function getFileExt(name: string): string {
   return name.split(".").pop()?.toLowerCase() ?? "";
}

export function EvidenceAttachment({ evidence }: EvidenceAttachmentProps) {
   const [previewUrl, setPreviewUrl] = useState<string | null>(null);
   const [loading, setLoading] = useState(false);

   const link = typeof evidence.link === "string" ? evidence.link : null;
   const filePath = typeof evidence.file_path === "string" ? evidence.file_path : null;
   const fileName =
      (typeof evidence.file_name === "string" ? evidence.file_name : null) ??
      "Lampiran";
   const ext = getFileExt(fileName);
   const isImage = IMAGE_EXTS.has(ext);

   async function fetchSignedUrl(): Promise<string | null> {
      if (!filePath) return null;
      setLoading(true);
      try {
         const res = await fetch(
            `/api/findings/evidence?path=${encodeURIComponent(filePath)}`,
         );
         const data = await res.json();
         if (data.url) {
            setPreviewUrl(data.url);
            return data.url as string;
         }
         return null;
      } catch {
         toast.error("Gagal mengunduh file");
         return null;
      } finally {
         setLoading(false);
      }
   }

   async function handleClick() {
      if (isImage) {
         if (previewUrl) {
            setPreviewUrl(null);
         } else {
            await fetchSignedUrl();
         }
      } else {
         const url = previewUrl ?? (await fetchSignedUrl());
         if (url) window.open(url, "_blank");
      }
   }

   return (
      <div className="mt-1 space-y-1">
         <div className="flex flex-wrap items-center gap-2 text-xs">
            {link && (
               <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 break-all"
               >
                  {link}
               </a>
            )}
            {filePath && (
               <button
                  type="button"
                  onClick={handleClick}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
               >
                  {loading ? (
                     <Loader2
                        className="h-3 w-3 animate-spin"
                        aria-hidden="true"
                     />
                  ) : isImage ? (
                     <ImageIcon className="h-3 w-3" aria-hidden="true" />
                  ) : (
                     <Paperclip className="h-3 w-3" aria-hidden="true" />
                  )}
                  {fileName}
                  {!isImage && (
                     <ExternalLink
                        className="h-3 w-3 ml-0.5"
                        aria-hidden="true"
                     />
                  )}
               </button>
            )}
         </div>
         {isImage && previewUrl && (
            <div className="mt-1 rounded-lg border border-base-300 overflow-hidden">
               <img
                  src={previewUrl}
                  alt={fileName}
                  className="max-h-48 w-full cursor-zoom-in object-contain bg-base-200/30"
                  onClick={() => window.open(previewUrl, "_blank")}
                  onError={() => {
                     setPreviewUrl(null);
                     toast.error("Gagal memuat pratinjau gambar");
                  }}
               />
            </div>
         )}
      </div>
   );
}
