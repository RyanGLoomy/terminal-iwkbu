import dynamic from "next/dynamic";
import { memo } from "react";
import { cn } from "@/lib/utils";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface LottieIconProps {
  animation: object;
  className?: string;
  size?: number;
  loop?: boolean;
  autoplay?: boolean;
}

function LottieIconInner({
  animation,
  className,
  size = 48,
  loop = true,
  autoplay = true,
}: LottieIconProps) {
  return (
    <div className={cn("flex items-center justify-center dark:hue-[-172deg] dark:brightness-[1.4]", className)}>
      <Lottie
        animationData={animation}
        loop={loop}
        autoplay={autoplay}
        style={{ width: size, height: size }}
      />
    </div>
  );
}

export const LottieIcon = memo(LottieIconInner);
