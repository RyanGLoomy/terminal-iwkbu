"use client";

import {
   IconBus,
   IconLogin,
   IconLogout,
   IconUsers,
   IconShieldCheck,
   IconActivity,
   IconTrendingUp,
   IconCalendar,
   IconFileText,
   IconCircleCheck,
   IconClock,
   IconAlertTriangle,
   IconDeviceDesktop,
   IconUserCheck,
} from "@tabler/icons-react";
import type { FC, SVGProps } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LottieIcon } from "@/components/ui/lottie-icon";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/use-count-up";

import lottieUsers from "@/lib/lottie/users.json";
import lottieTrendingUp from "@/lib/lottie/trending-up.json";
import lottieAlertTriangle from "@/lib/lottie/alert-triangle.json";
import lottieClock from "@/lib/lottie/clock.json";
import lottieCalendar from "@/lib/lottie/calendar.json";
import lottieFileText from "@/lib/lottie/file-text.json";
import lottieActivity from "@/lib/lottie/activity.json";
import lottieBus from "@/lib/lottie/bus.json";
import lottieShieldCheck from "@/lib/lottie/shield-check.json";
import lottieCheckCircle from "@/lib/lottie/check-circle.json";
import lottieLogIn from "@/lib/lottie/log-in.json";
import lottieLogOut from "@/lib/lottie/log-out.json";
import lottieUserCheck from "@/lib/lottie/user-check.json";
import lottieMonitor from "@/lib/lottie/monitor.json";

type TablerIcon = FC<SVGProps<SVGSVGElement> & { size?: string | number }>;

export type IconName =
   | "bus" | "log-in" | "log-out" | "users"
   | "shield-check" | "activity" | "trending-up" | "calendar"
   | "file-text" | "check-circle"
   | "clock" | "alert-triangle" | "monitor" | "user-check";

const iconMap: Record<IconName, TablerIcon> = {
   bus: IconBus, "log-in": IconLogin, "log-out": IconLogout, users: IconUsers,
   "shield-check": IconShieldCheck, activity: IconActivity, "trending-up": IconTrendingUp,
   calendar: IconCalendar, "file-text": IconFileText,
   "check-circle": IconCircleCheck, clock: IconClock,
   "alert-triangle": IconAlertTriangle, monitor: IconDeviceDesktop, "user-check": IconUserCheck,
};

const lottieMap: Partial<Record<IconName, object>> = {
    bus: lottieBus,
    users: lottieUsers,
    "trending-up": lottieTrendingUp,
   "alert-triangle": lottieAlertTriangle,
   clock: lottieClock,
   calendar: lottieCalendar,
   "file-text": lottieFileText,
   activity: lottieActivity,
   "shield-check": lottieShieldCheck,
   "check-circle": lottieCheckCircle,
   "log-in": lottieLogIn,
   "log-out": lottieLogOut,
   "user-check": lottieUserCheck,
   "monitor": lottieMonitor,
};

type DashboardCardProps = {
   title: string;
   value: string | number;
   description?: string;
   icon?: TablerIcon | IconName;
   lottieAnimation?: object;
   accent?: "blue" | "green" | "amber" | "violet" | "red" | "default";
   index?: number;
   animateCount?: boolean;
};

/* Light mode: warna text diperdalam untuk kenyamanan mata (contrast ≥ 4.5:1).
   Dark mode: pakai token DaisyUI (sudah dioptimalkan untuk background gelap).
   ┌──────────┬────────────────┬──────────┬────────────┐
   │ Accent   │ Light text     │ Hex      │ Contrast   │
   ├──────────┼────────────────┼──────────┼────────────┤
   │ amber    │ text-amber-800 │ #92400E  │ 7.3:1 ✓   │ (was 2:1 ❌)
   │ green    │ text-green-700 │ #15803D  │ 5.4:1 ✓   │ (was 3.2:1 ⚠)
   │ violet   │ text-sky-700   │ #0369A1  │ 5.8:1 ✓   │ (was 3.0:1 ⚠)
   └──────────┴────────────────┴──────────┴────────────┘ */
const accentConfig: Record<NonNullable<DashboardCardProps["accent"]>, string> = {
   blue: "bg-primary/10 text-primary ring-primary/15",
   green: "bg-success/10 text-green-700 dark:text-success ring-success/15",
   amber: "bg-warning/15 text-amber-800 dark:text-warning ring-warning/20",
   violet: "bg-info/10 text-sky-700 dark:text-info ring-info/15",
   red: "bg-error/10 text-error ring-error/15",
   default: "bg-base-300/70 text-base-content/70 ring-base-300",
};

/* Icon yang punya asosiasi warna semantik universal.
   Override accent card agar icon + badge selalu konsisten:
   - alert-triangle → amber (warning)
   - check-circle, shield-check → green (success/verified) */
const semanticAccent: Partial<Record<IconName, NonNullable<DashboardCardProps["accent"]>>> = {
   "alert-triangle": "amber",
   "check-circle": "green",
   "shield-check": "green",
};

function DashboardCardInner({
   title,
   value,
   description,
   icon,
   lottieAnimation,
   accent = "default",
   animateCount,
}: DashboardCardProps) {
   const Icon = typeof icon === "string" ? iconMap[icon] : icon;
   // Always use lottieMap (direct JSON import) — the lottieAnimation prop
   // arrives corrupted after RSC serialization (truthy but with broken nested
   // keyframe data), so we must not rely on it via ??.
   const resolvedLottie = typeof icon === "string" ? lottieMap[icon] : lottieAnimation;
   const iconName = typeof icon === "string" ? icon : undefined;
   const effectiveAccent = (iconName && semanticAccent[iconName]) || accent;
   const numericValue = typeof value === "number" ? value : parseInt(String(value), 10);
   const counted = useCountUp(animateCount && !isNaN(numericValue) ? numericValue : 0);
   const displayValue = animateCount && !isNaN(numericValue) ? counted : value;

   return (
      <Card>
         <CardContent className="pb-5 pt-5">
            <div className="flex items-start justify-between gap-3">
               <div className="min-w-0 space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.10em] text-base-content/55">
                     {title}
                  </p>
                  <p className="text-3xl font-extrabold tracking-tight text-base-content tabular-nums">
                      {displayValue}
                   </p>
                  {description && (
                     <p className="pt-1 text-xs leading-5 text-base-content/55">
                        {description}
                     </p>
                  )}
               </div>
               {(resolvedLottie || Icon) && (
                  <div
                      className={cn(
                         "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1",
                         "mt-5",
                         accentConfig[effectiveAccent],
                      )}
                  >
                      {resolvedLottie ? (
                         <LottieIcon
                            animation={resolvedLottie}
                            size={44}
                            className={cn(
                               "h-full w-full",
                               typeof icon === "string" && icon === "bus" && "scale-[1.65]",
                            )}
                         />
                      ) : Icon ? (
                        <Icon className="h-6 w-6" aria-hidden="true" />
                     ) : null}
                  </div>
               )}
            </div>
         </CardContent>
      </Card>
   );
}

export const DashboardCard = DashboardCardInner;
