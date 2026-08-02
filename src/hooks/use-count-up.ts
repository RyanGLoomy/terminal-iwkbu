"use client";

import { useEffect, useRef, useState } from "react";

export function useCountUp(end: number, durationMs = 10000) {
   const [display, setDisplay] = useState(0);
   const frameRef = useRef<number>(0);

   useEffect(() => {
      if (end === 0) {
         setDisplay(0);
         return;
      }

      const start = performance.now();

      function tick(now: number) {
         const elapsed = now - start;
         const progress = Math.min(elapsed / durationMs, 1);
         // ease-out cubic
         const eased = 1 - (1 - progress) ** 3;
         setDisplay(Math.round(eased * end));

         if (progress < 1) {
            frameRef.current = requestAnimationFrame(tick);
         }
      }

      frameRef.current = requestAnimationFrame(tick);

      return () => cancelAnimationFrame(frameRef.current);
   }, [end, durationMs]);

   return display;
}
