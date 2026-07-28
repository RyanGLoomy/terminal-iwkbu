"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

/**
 * Strip `l` (separated-dimensions) properties from Lottie keyframe data.
 * lottie-web 5.12 SVG renderer mishandles `l: 2` from Bodymovin v5.7+,
 * causing empty SVG shells. Removing `l` forces the legacy combined format
 * which lottie-web renders correctly.
 */
function stripSeparatedDimensions(data: Record<string, unknown>): Record<string, unknown> {
  if (!data || typeof data !== "object") return data;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "l" && typeof value === "number" && value >= 1) continue;
    if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === "object"
          ? stripSeparatedDimensions(item as Record<string, unknown>)
          : item,
      );
    } else if (value && typeof value === "object") {
      result[key] = stripSeparatedDimensions(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

interface LottieIconProps {
  animation: object;
  className?: string;
  size?: number;
  loop?: boolean;
  autoplay?: boolean;
}

export function LottieIcon({
  animation,
  className,
  size = 48,
  loop = true,
  autoplay = true,
}: LottieIconProps) {
  const safeAnimation = useMemo(
    () => stripSeparatedDimensions(animation as Record<string, unknown>),
    [animation],
  );

  return (
    <div className={cn("flex items-center justify-center dark:hue-[-172deg] dark:brightness-[1.4]", className)}>
      <Lottie
        animationData={safeAnimation}
        loop={loop}
        autoplay={autoplay}
        style={{ width: size, height: size }}
      />
    </div>
  );
}
