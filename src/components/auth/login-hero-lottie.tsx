"use client";

import dynamic from "next/dynamic";
import loadingDotsLottie from "@/lib/lottie/loading-dots.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export function LoginHeroLottie() {
   return (
      <div className="flex items-center justify-center dark:hue-[-172deg] dark:brightness-[1.4]">
         <Lottie
            animationData={loadingDotsLottie}
            loop
            autoplay
            style={{ width: 80, height: 80 }}
         />
      </div>
   );
}
