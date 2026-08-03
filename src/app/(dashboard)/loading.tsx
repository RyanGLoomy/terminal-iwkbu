import { IconLoader2 } from "@tabler/icons-react";

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <IconLoader2 className="size-8 animate-spin text-base-content/40" />
    </div>
  );
}
