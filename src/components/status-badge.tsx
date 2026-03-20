import type { CheckStatus } from "@/lib/checker/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  CheckStatus,
  { label: string; className: string }
> = {
  operational: {
    label: "正常",
    className: "bg-status-operational/15 text-status-operational",
  },
  degraded: {
    label: "缓慢",
    className: "bg-status-degraded/15 text-status-degraded",
  },
  failed: {
    label: "故障",
    className: "bg-status-failed/15 text-status-failed",
  },
  error: {
    label: "异常",
    className: "bg-status-error/15 text-status-error",
  },
};

export function StatusBadge({ status }: { status: CheckStatus }) {
  const config = statusConfig[status] ?? statusConfig.error;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", {
          "bg-status-operational": status === "operational",
          "bg-status-degraded": status === "degraded",
          "bg-status-failed": status === "failed",
          "bg-status-error": status === "error",
        })}
      />
      {config.label}
    </span>
  );
}
