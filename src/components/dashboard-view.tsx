"use client";

import { useDashboard } from "@/hooks/use-dashboard";
import { ProviderCard } from "./provider-card";
import { Loader2, AlertCircle } from "lucide-react";

export function DashboardView() {
  const { data, isLoading, error } = useDashboard();

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
      {data.groups.map((group) =>
        group.configs.length > 0 ? (
          <section key={group.id}>
            <div className="mb-4">
              <h2 className="text-xl font-bold">{group.name}</h2>
              {group.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {group.description}
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.configs.map((config) => (
                <ProviderCard key={config.id} config={config} />
              ))}
            </div>
          </section>
        ) : null
      )}

      {data.ungrouped.length > 0 && (
        <section>
          {data.groups.length > 0 && (
            <h2 className="mb-4 text-xl font-bold">其他</h2>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.ungrouped.map((config) => (
              <ProviderCard key={config.id} config={config} />
            ))}
          </div>
        </section>
      )}

      <div className="text-center text-xs text-muted-foreground">
        最后更新: {new Date(data.lastUpdated).toLocaleString("zh-CN")}
        <span className="ml-2">（每 30 秒自动刷新）</span>
      </div>
    </div>
  );
}
