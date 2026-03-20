import type { DashboardConfig } from "@/lib/checker/types";
import { StatusBadge } from "./status-badge";
import { StatusTimeline } from "./status-timeline";

function formatLatency(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "从未检查";
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60_000) return "刚刚";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  return date.toLocaleDateString("zh-CN");
}

function formatUptime(value: number | null): string {
  if (value === null) return "暂无";
  return `${value}%`;
}

export function ProviderCard({ config }: { config: DashboardConfig }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-card-foreground">
            {config.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {config.model}
          </p>
        </div>
        <StatusBadge status={config.currentStatus} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xs text-muted-foreground">延迟</div>
          <div className="mt-0.5 text-sm font-medium">
            {formatLatency(config.latency)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">7天可用</div>
          <div className="mt-0.5 text-sm font-medium">
            {formatUptime(config.uptimePercent7d)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">30天可用</div>
          <div className="mt-0.5 text-sm font-medium">
            {formatUptime(config.uptimePercent30d)}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <StatusTimeline history={config.history} />
      </div>

      <div className="mt-2 text-right text-[11px] text-muted-foreground">
        最后检查: {formatTime(config.lastCheckedAt)}
      </div>
    </div>
  );
}
