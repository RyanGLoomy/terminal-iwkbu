"use client";

import dynamic from "next/dynamic";
import notificationBellLottie from "@/lib/lottie/notification-bell.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export function LoginHeroLottie() {
   return (
      <div className="flex items-center justify-center dark:hue-[-172deg] dark:brightness-[1.4]">
         <Lottie
            animationData={notificationBellLottie}
            loop
            autoplay
            style={{ width: 80, height: 80 }}
         />
      </div>
   );
}
