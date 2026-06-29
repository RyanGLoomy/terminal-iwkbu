"use client";

/**
 * Delicate ASCII Dots Effect
 *
 * Renders a grid of tiny dot characters with staggered opacity-wave
 * animations. Pure CSS animation → zero JS per-frame cost, GPU-friendly.
 *
 * Props:
 *  - cols/rows : grid density (keep total ≤ 300 for perf)
 *  - className : extra classes on the container
 */

const CHARS = ["·", ".", ":", "⋅", "∙"] as const;

type Dot = {
   char: string;
   delay: number;
   duration: number;
   brightness: number;
};

// Deterministic pseudo-random so SSR/client match
function buildDots(cols: number, rows: number): Dot[] {
   const arr: Dot[] = [];
   let seed = 42;
   const rand = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed - 1) / 2147483646;
   };

   for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
         const charIdx = Math.floor(rand() * CHARS.length);
         // Wave-based delay: distance from top-left creates diagonal sweep
         const wave = (r + c) * 0.25;
         const jitter = rand() * 2;
         arr.push({
            char: CHARS[charIdx],
            delay: wave + jitter,
            duration: 3 + rand() * 4,
            brightness: 0.3 + rand() * 0.7,
         });
      }
   }
   return arr;
}

interface AsciiDotsProps {
   cols?: number;
   rows?: number;
   className?: string;
}

export function AsciiDotsEffect({
   cols = 14,
   rows = 18,
   className,
}: AsciiDotsProps) {
   const dots = buildDots(cols, rows);

   return (
      <div
         className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className ?? ""}`}
         aria-hidden="true"
      >
         <div
            className="ascii-dots-grid h-full w-full"
            style={{
               display: "grid",
               gridTemplateColumns: `repeat(${cols}, 1fr)`,
               gridTemplateRows: `repeat(${rows}, 1fr)`,
               gap: 0,
            }}
         >
            {dots.map((dot, i) => (
               <span
                  key={i}
                  className="ascii-dot flex items-center justify-center"
                  style={
                     {
                        "--dot-delay": `${dot.delay}s`,
                        "--dot-duration": `${dot.duration}s`,
                        "--dot-brightness": dot.brightness,
                     } as React.CSSProperties
                  }
               >
                  {dot.char}
               </span>
            ))}
         </div>
      </div>
   );
}
