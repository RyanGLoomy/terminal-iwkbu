import { useLottieWeb } from "@/hooks/use-lottie-web";
import { cn } from "@/lib/utils";

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
  const { containerRef } = useLottieWeb({
    animationData: animation,
    loop,
    autoplay,
  });

  return (
    <div className={cn("flex items-center justify-center dark:hue-[-172deg] dark:brightness-[1.4]", className)}>
      <div ref={containerRef} style={{ width: size, height: size }} />
    </div>
  );
}
