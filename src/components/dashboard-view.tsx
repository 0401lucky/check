"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/hooks/use-dashboard";
import { ProviderCard } from "./provider-card";
import {
  AlertCircle,
  ChevronDown,
  Clock3,
  Loader2,
  ShieldAlert,
  Siren,
  Sparkles,
  Wrench,
} from "lucide-react";

function formatLastUpdated(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN");
}

function summarizeStatuses(
  configs: Array<{ currentStatus: string }>
): Array<{ key: string; label: string; count: number; className: string }> {
  const counts = {
    operational: 0,
    degraded: 0,
    failed: 0,
    maintenance: 0,
    error: 0,
  };

  for (const config of configs) {
    if (config.currentStatus in counts) {
      counts[config.currentStatus as keyof typeof counts] += 1;
    }
  }

  return [
    {
      key: "operational",
      label: "正常",
      count: counts.operational,
      className: "bg-status-operational/12 text-status-operational",
    },
    {
      key: "degraded",
      label: "缓慢",
      count: counts.degraded,
      className: "bg-status-degraded/12 text-status-degraded",
    },
    {
      key: "maintenance",
      label: "维护",
      count: counts.maintenance,
      className: "bg-status-degraded/12 text-status-degraded",
    },
    {
      key: "failed",
      label: "故障",
      count: counts.failed + counts.error,
      className: "bg-status-failed/12 text-status-failed",
    },
  ].filter((item) => item.count > 0);
}

export function DashboardView() {
  const { data, isLoading, error } = useDashboard();
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-2 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p>加载失败: {error?.message ?? "未知错误"}</p>
        <p className="text-sm text-muted-foreground">请刷新页面重试</p>
      </div>
    );
  }

  const hasConfigs =
    data.groups.some((g) => g.configs.length > 0) ||
    data.ungrouped.length > 0;

  const allConfigs = [
    ...data.groups.flatMap((group) => group.configs),
    ...data.ungrouped,
  ];

  const summary = {
    total: allConfigs.length,
    operational: allConfigs.filter((item) => item.currentStatus === "operational")
      .length,
    degraded: allConfigs.filter((item) => item.currentStatus === "degraded").length,
    failed: allConfigs.filter(
      (item) =>
        item.currentStatus === "failed" || item.currentStatus === "error"
    ).length,
    maintenance: allConfigs.filter(
      (item) => item.currentStatus === "maintenance"
    ).length,
  };

  const groupSummaries = useMemo(() => {
    const entries = new Map<string, ReturnType<typeof summarizeStatuses>>();

    for (const group of data.groups) {
      entries.set(group.id, summarizeStatuses(group.configs));
    }

    entries.set("ungrouped", summarizeStatuses(data.ungrouped));
    return entries;
  }, [data.groups, data.ungrouped]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  if (!hasConfigs) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-lg">暂无监控配置</p>
        <p className="text-sm">请前往管理后台添加 AI 模型端点</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(250,250,249,0.96)),radial-gradient(circle_at_top_left,rgba(255,245,214,0.8),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(219,234,254,0.8),transparent_28%)] p-6 shadow-[0_35px_90px_-42px_rgba(15,23,42,0.55)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Live Provider Board
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              把 AI 供应商状态压缩成一眼就能判断的实时状态墙
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              自动轮询可用性、延迟、维护状态和最近错误原因。
              出问题时不用翻日志，首页就能直接看到异常分布。
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  总配置
                </div>
                <div className="mt-2 text-3xl font-semibold">{summary.total}</div>
              </div>
              <div className="rounded-2xl border border-status-operational/25 bg-status-operational/10 p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-status-operational/80">
                  <Sparkles className="h-4 w-4" />
                  正常
                </div>
                <div className="mt-2 text-3xl font-semibold text-status-operational">
                  {summary.operational}
                </div>
              </div>
              <div className="rounded-2xl border border-status-degraded/25 bg-status-degraded/10 p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-status-degraded/80">
                  <Clock3 className="h-4 w-4" />
                  缓慢 / 维护
                </div>
                <div className="mt-2 text-3xl font-semibold text-status-degraded">
                  {summary.degraded + summary.maintenance}
                </div>
              </div>
              <div className="rounded-2xl border border-status-failed/25 bg-status-failed/10 p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-status-failed/80">
                  <Siren className="h-4 w-4" />
                  故障 / 异常
                </div>
                <div className="mt-2 text-3xl font-semibold text-status-failed">
                  {summary.failed}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[28px] border border-border/70 bg-background/82 p-5 shadow-sm">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                最后更新
              </div>
              <div className="mt-3 text-lg font-semibold">
                {formatLastUpdated(data.lastUpdated)}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                页面每 30 秒自动刷新一次
              </div>
            </div>
            <div className="rounded-[28px] border border-status-degraded/25 bg-status-degraded/8 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-status-degraded/80">
                <Wrench className="h-4 w-4" />
                维护模式
              </div>
              <div className="mt-3 text-lg font-semibold text-status-degraded">
                {summary.maintenance} 个配置正在维护
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                维护中的配置会保留卡片，但暂停轮询
              </div>
            </div>
            <div className="rounded-[28px] border border-border/70 bg-background/82 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <ShieldAlert className="h-4 w-4" />
                故障关注
              </div>
              <div className="mt-3 text-lg font-semibold">
                {summary.failed > 0
                  ? `当前有 ${summary.failed} 项需要处理`
                  : "当前没有阻断性故障"}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                卡片里会直接展示最近错误原因
              </div>
            </div>
          </div>
        </div>
      </section>

      {data.groups.map((group) =>
        group.configs.length > 0 ? (
          <section
            key={group.id}
            className="rounded-[30px] border border-border/70 bg-card/80 p-5 shadow-[0_26px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur"
          >
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-end sm:justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/75">
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${
                      collapsedGroups[group.id] ? "-rotate-90" : "rotate-0"
                    }`}
                  />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Group
                  </div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    {group.name}
                  </h2>
                  {group.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {group.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(groupSummaries.get(group.id) ?? []).map((item) => (
                      <span
                        key={item.key}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.className}`}
                      >
                        {item.label} {item.count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{group.configs.length} 个配置</span>
                <span>{collapsedGroups[group.id] ? "已收起" : "展开中"}</span>
              </div>
            </button>
            {!collapsedGroups[group.id] && (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {group.configs.map((config) => (
                  <ProviderCard key={config.id} config={config} />
                ))}
              </div>
            )}
          </section>
        ) : null
      )}

      {data.ungrouped.length > 0 && (
        <section className="rounded-[30px] border border-border/70 bg-card/80 p-5 shadow-[0_26px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <button
            type="button"
            onClick={() => toggleGroup("ungrouped")}
            className="flex w-full items-start justify-between gap-4 text-left"
          >
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/75">
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${
                    collapsedGroups.ungrouped ? "-rotate-90" : "rotate-0"
                  }`}
                />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Group
                </div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  其他
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(groupSummaries.get("ungrouped") ?? []).map((item) => (
                    <span
                      key={item.key}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.className}`}
                    >
                      {item.label} {item.count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{data.ungrouped.length} 个配置</span>
              <span>{collapsedGroups.ungrouped ? "已收起" : "展开中"}</span>
            </div>
          </button>
          {!collapsedGroups.ungrouped && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {data.ungrouped.map((config) => (
                <ProviderCard key={config.id} config={config} />
              ))}
            </div>
          )}
        </section>
      )}

      <div className="text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Last Updated {formatLastUpdated(data.lastUpdated)} · Auto Refresh Every 30 Seconds
      </div>
    </div>
  );
}
