import type { DashboardConfig } from "@/lib/checker/types";
import { StatusBadge } from "./status-badge";
import { StatusTimeline } from "./status-timeline";
import { cn } from "@/lib/utils";

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

function formatSuccessStats(
  successCount: number | null,
  totalCount: number | null
): string {
  if (successCount === null || totalCount === null) return "暂无数据";
  return `${successCount}/${totalCount} 成功`;
}

const statusToneMap = {
  operational:
    "border-status-operational/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(237,252,244,0.94))]",
  degraded:
    "border-status-degraded/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,249,232,0.96))]",
  failed:
    "border-status-failed/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,241,241,0.96))]",
  maintenance:
    "border-status-degraded/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,250,235,0.96))]",
  error:
    "border-status-error/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,245,247,0.96))]",
} as const;

export function ProviderCard({ config }: { config: DashboardConfig }) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[26px] border p-5 shadow-[0_22px_52px_-30px_rgba(15,23,42,0.45)] transition-all hover:-translate-y-1 hover:shadow-[0_26px_72px_-32px_rgba(15,23,42,0.45)]",
        statusToneMap[config.currentStatus] ?? statusToneMap.error
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--color-status-operational),var(--color-status-degraded),var(--color-status-failed))] opacity-80" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Provider
          </div>
          <h3 className="mt-1 truncate text-lg font-semibold text-card-foreground">
            {config.name}
          </h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {config.model}
          </p>
        </div>
        <StatusBadge status={config.currentStatus} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            延迟
          </div>
          <div className="mt-1 text-sm font-semibold">
            {formatLatency(config.latency)}
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            7天可用
          </div>
          <div className="mt-1 text-sm font-semibold">
            {formatUptime(config.uptimePercent7d)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {formatSuccessStats(config.successCount7d, config.totalCount7d)}
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            30天可用
          </div>
          <div className="mt-1 text-sm font-semibold">
            {formatUptime(config.uptimePercent30d)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {formatSuccessStats(config.successCount30d, config.totalCount30d)}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border/60 bg-background/60 px-3 py-3">
        <StatusTimeline history={config.history} />
      </div>

      {config.currentMessage && (
        <div
          className="mt-4 rounded-2xl border border-border/60 bg-background/65 px-3 py-3 text-xs text-muted-foreground"
          title={config.currentMessage}
        >
          <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            最近结果
          </div>
          {config.currentMessage}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>状态采样 60 条</span>
        最后检查: {formatTime(config.lastCheckedAt)}
      </div>
    </article>
  );
}
