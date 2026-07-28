"use client";

import { useLottieWeb } from "@/hooks/use-lottie-web";
import loadingDotsLottie from "@/lib/lottie/loading-dots.json";

export function LoginHeroLottie() {
   const { containerRef } = useLottieWeb({
      animationData: loadingDotsLottie,
      loop: true,
      autoplay: true,
   });

   return (
      <div className="flex items-center justify-center dark:hue-[-172deg] dark:brightness-[1.4]">
         <div ref={containerRef} style={{ width: 80, height: 80 }} />
      </div>
   );
}
