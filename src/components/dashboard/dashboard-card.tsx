"use client";

import {
   type LucideIcon,
   Bus,
   LogIn,
   LogOut,
   Users,
   ShieldCheck,
   Activity,
   TrendingUp,
   Calendar,
   FileText,
   CreditCard,
   CheckCircle,
   XCircle,
   Clock,
   AlertTriangle,
   Monitor,
   UserCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type IconName =
   | "bus" | "log-in" | "log-out" | "users"
   | "shield-check" | "activity" | "trending-up" | "calendar"
   | "file-text" | "credit-card" | "check-circle" | "x-circle"
   | "clock" | "alert-triangle" | "monitor" | "user-check";

const iconMap: Record<IconName, LucideIcon> = {
   bus: Bus, "log-in": LogIn, "log-out": LogOut, users: Users,
   "shield-check": ShieldCheck, activity: Activity, "trending-up": TrendingUp,
   calendar: Calendar, "file-text": FileText, "credit-card": CreditCard,
   "check-circle": CheckCircle, "x-circle": XCircle, clock: Clock,
   "alert-triangle": AlertTriangle, monitor: Monitor, "user-check": UserCheck,
};

type DashboardCardProps = {
   title: string;
   value: string;
   description?: string;
   icon?: LucideIcon | IconName;
   accent?: "blue" | "green" | "amber" | "violet" | "red" | "default";
   index?: number;
};

// Accent bersih lewat icon badge semantik (tanpa glow / gradient bar).
const accentConfig: Record<NonNullable<DashboardCardProps["accent"]>, string> = {
   blue: "bg-primary/10 text-primary ring-primary/15",
   green: "bg-success/10 text-success ring-success/15",
   amber: "bg-warning/10 text-warning ring-warning/15",
   violet: "bg-info/10 text-info ring-info/15",
   red: "bg-error/10 text-error ring-error/15",
   default: "bg-base-300/70 text-base-content/70 ring-base-300",
};

export function DashboardCard({
   title,
   value,
   description,
   icon,
   accent = "default",
}: DashboardCardProps) {
   const Icon = typeof icon === "string" ? iconMap[icon] : icon;

   return (
      <Card>
         <CardContent className="pb-5 pt-5">
            <div className="flex items-start justify-between gap-3">
               <div className="min-w-0 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-base-content/55">
                     {title}
                  </p>
                  <p className="text-3xl font-extrabold tracking-tight text-base-content">
                     {value}
                  </p>
                  {description && (
                     <p className="pt-1 text-xs leading-5 text-base-content/55">
                        {description}
                     </p>
                  )}
               </div>
               {Icon && (
                  <div
                     className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1",
                        accentConfig[accent],
                     )}
                  >
                     <Icon className="h-6 w-6" />
                  </div>
               )}
            </div>
         </CardContent>
      </Card>
   );
}
