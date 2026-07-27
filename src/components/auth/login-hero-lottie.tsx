"use client";

import dynamic from "next/dynamic";

const LottieIcon = dynamic(() => import("@/components/ui/lottie-icon").then(m => m.LottieIcon), { ssr: false });

import loadingDotsLottie from "@/lib/lottie/loading-dots.json";

export function LoginHeroLottie() {
   return (
      <div className="flex flex-col items-center gap-3">
         <LottieIcon animation={loadingDotsLottie} size={80} loop autoplay />
         <p className="text-xs text-white/50">Memuat sistem...</p>
      </div>
   );
}
