import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

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
  return (
    <div className={cn("flex items-center justify-center dark:hue-[-172deg] dark:brightness-[1.4]", className)}>
      <Lottie
        animationData={animation}
        loop={loop}
        autoplay={autoplay}
        renderer="svg"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
