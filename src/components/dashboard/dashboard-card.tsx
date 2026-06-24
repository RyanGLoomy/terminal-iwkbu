"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
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

const accentConfig = {
  blue: { iconBg: "bg-brand-sky/15 text-brand-sky ring-brand-sky/25", glow: "glow-blue", bar: "from-brand-sky to-brand-navy" },
  green: { iconBg: "bg-brand-green/15 text-brand-green ring-brand-green/25", glow: "glow-green", bar: "from-brand-green to-emerald-700" },
  amber: { iconBg: "bg-amber-500/15 text-accent ring-amber-500/25", glow: "glow-amber", bar: "from-amber-400 to-amber-600" },
  violet: { iconBg: "bg-violet-500/15 text-violet-600 ring-violet-500/25", glow: "glow-violet", bar: "from-violet-400 to-violet-700" },
  red: { iconBg: "bg-destructive/15 text-destructive ring-destructive/25", glow: "glow-red", bar: "from-red-400 to-destructive" },
  default: { iconBg: "bg-muted text-muted-foreground ring-border", glow: "", bar: "from-muted-foreground to-foreground" },
};

export const DashboardCard = React.memo(function DashboardCard({
  title,
  value,
  description,
  icon,
  accent = "default",
}: DashboardCardProps) {
  const Icon = typeof icon === "string" ? iconMap[icon] : icon;
  const config = accentConfig[accent];

  return (
    <Card
      className={`group ${config.glow}`}
    >
      <CardContent className="pb-5 pt-5">
        <div className={`mb-5 h-1.5 w-16 rounded-full bg-gradient-to-r ${config.bar}`} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-[11px] font800 uppercase tracking-[0.12em] text-muted-foreground">
              {title}
            </p>
            <p className="text-3xl font800 tracking-tight text-foreground">
              {value}
            </p>
            {description && (
              <p className="pt-1 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {Icon && (
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${config.iconBg}`}
            >
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
