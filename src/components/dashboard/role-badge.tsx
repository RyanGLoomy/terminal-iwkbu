import React from "react";
import { Badge } from "@/components/ui/badge";
import { ROLE_DISPLAY_NAMES, type RoleType } from "@/config/roles";

const roleColors: Record<RoleType, string> = {
  po: "border-brand-sky/25 bg-brand-sky/10 text-brand-sky",
  loket: "border-brand-green/25 bg-brand-green/10 text-brand-green",
  "admin-terminal": "border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  "staf-iw": "border-amber-500/25 bg-amber-500/10 text-accent dark:text-amber-300",
};

const roleDots: Record<RoleType, string> = {
  po: "status-info",
  loket: "status-success",
  "admin-terminal": "bg-violet-500",
  "staf-iw": "status-warning",
};

interface RoleBadgeProps {
  role: RoleType;
}

export const RoleBadge = React.memo(function RoleBadge({
  role,
}: RoleBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`${roleColors[role]} px-3 py-1.5 text-[11px] font800`}
    >
      <span className={`status-dot ${roleDots[role]}`} />
      {ROLE_DISPLAY_NAMES[role]}
    </Badge>
  );
});
