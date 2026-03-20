"use client";

import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfigItem {
  id: string;
  name: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  metadata: Record<string, unknown> | null;
  requestHeaders: Record<string, string> | null;
  groupId: string | null;
  enabled: boolean;
  isMaintenance: boolean;
  sortOrder: number;
  group: { id: string; name: string } | null;
}

interface ConfigTableProps {
  configs: ConfigItem[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  onEdit: (config: ConfigItem) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

export function ConfigTable({
  configs,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  onToggle,
}: ConfigTableProps) {
  const allSelected =
    configs.length > 0 && configs.every((config) => selectedIds.includes(config.id));

  if (configs.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground shadow-sm">
        当前筛选条件下没有配置
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card/95 shadow-[0_18px_48px_-24px_rgba(15,23,42,0.35)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/60 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <th className="w-12 px-4 py-3 font-medium">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleSelectAll(configs.map((config) => config.id))}
                className="h-4 w-4 rounded border"
                aria-label="全选当前列表"
              />
            </th>
            <th className="px-4 py-3 font-medium">名称</th>
            <th className="px-4 py-3 font-medium">模型</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">
              API 地址
            </th>
            <th className="px-4 py-3 font-medium">分组</th>
            <th className="hidden px-4 py-3 font-medium lg:table-cell">
              附加请求头
            </th>
            <th className="hidden px-4 py-3 font-medium lg:table-cell">
              附加参数
            </th>
            <th className="px-4 py-3 font-medium">状态</th>
            <th className="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {configs.map((config) => (
            <tr
              key={config.id}
              className={cn(
                "transition-colors hover:bg-muted/30",
                selectedIds.includes(config.id) && "bg-accent/40"
              )}
            >
              <td className="px-4 py-3 align-top">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(config.id)}
                  onChange={() => onToggleSelect(config.id)}
                  className="h-4 w-4 rounded border"
                  aria-label={`选择 ${config.name}`}
                />
              </td>
              <td className="px-4 py-3 align-top">
                <div className="font-medium">{config.name}</div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                  {config.group?.name && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                      {config.group.name}
                    </span>
                  )}
                  {config.metadata && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      参数 {Object.keys(config.metadata).length}
                    </span>
                  )}
                  {config.requestHeaders && (
                    <span className="rounded-full bg-status-degraded/12 px-2 py-0.5 text-status-degraded">
                      请求头 {Object.keys(config.requestHeaders).length}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 align-top text-muted-foreground">
                <div className="max-w-[260px] break-all">{config.model}</div>
              </td>
              <td className="hidden max-w-[240px] px-4 py-3 align-top text-muted-foreground md:table-cell">
                <div className="truncate">{config.baseUrl}</div>
              </td>
              <td className="px-4 py-3 align-top text-muted-foreground">
                {config.group?.name ?? "-"}
              </td>
              <td className="hidden px-4 py-3 align-top text-muted-foreground lg:table-cell">
                {config.requestHeaders
                  ? `${Object.keys(config.requestHeaders).length} 项`
                  : "-"}
              </td>
              <td className="hidden px-4 py-3 align-top text-muted-foreground lg:table-cell">
                {config.metadata
                  ? `${Object.keys(config.metadata).length} 项`
                  : "-"}
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onToggle(config.id, !config.enabled)}
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      config.enabled
                        ? "bg-status-operational/15 text-status-operational"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {config.enabled ? "已启用" : "已禁用"}
                  </button>
                    {config.isMaintenance && (
                    <span className="inline-flex items-center rounded-full bg-status-degraded/15 px-2.5 py-0.5 text-xs font-medium text-status-degraded">
                      维护中
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(config)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="编辑"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`确定要删除 "${config.name}" 吗？`)) {
                        onDelete(config.id);
                      }
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
