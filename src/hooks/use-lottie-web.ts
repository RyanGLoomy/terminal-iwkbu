import { useEffect, useRef } from "react";
import type { AnimationItem } from "lottie-web";

interface UseLottieWebOptions {
   animationData: object;
   loop?: boolean;
   autoplay?: boolean;
}

export function useLottieWeb({ animationData, loop = true, autoplay = true }: UseLottieWebOptions) {
   const containerRef = useRef<HTMLDivElement>(null);
   const animRef = useRef<AnimationItem | null>(null);

   useEffect(() => {
      let cancelled = false;

      async function init() {
         const lottie = (await import("lottie-web")).default;
         if (cancelled || !containerRef.current) return;

         animRef.current = lottie.loadAnimation({
            container: containerRef.current,
            renderer: "svg",
            loop,
            autoplay,
            animationData,
         });
      }

      init();

      return () => {
         cancelled = true;
         animRef.current?.destroy();
         animRef.current = null;
      };
   }, [animationData, loop, autoplay]);

   return { containerRef, animRef };
}
