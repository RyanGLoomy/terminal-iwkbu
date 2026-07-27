"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const LottieIcon = dynamic(
   () => import("@/components/ui/lottie-icon").then((m) => m.LottieIcon),
   { ssr: false },
);

import notFoundAnimation from "@/lib/lottie/not-found.json";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base-100 px-4">
      <div className="text-center max-w-md">
        <LottieIcon
          animation={notFoundAnimation}
          size={280}
          loop
          autoplay
          className="mx-auto"
        />
        <p className="mt-4 text-lg text-base-content/70">
          Halaman tidak ditemukan.
        </p>
        <p className="mt-2 text-sm text-base-content/70">
          Halaman yang Anda cari mungkin telah dipindahkan atau tidak tersedia.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
        >
          Kembali ke Halaman Login
        </Link>
      </div>
    </div>
  );
}
