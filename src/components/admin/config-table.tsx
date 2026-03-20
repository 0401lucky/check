"use client";

import { Pencil, Trash2 } from "lucide-react";

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
  onEdit: (config: ConfigItem) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

export function ConfigTable({
  configs,
  onEdit,
  onDelete,
  onToggle,
}: ConfigTableProps) {
  if (configs.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground shadow-sm">
        暂无监控配置，点击上方按钮添加
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
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
            <tr key={config.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium">{config.name}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {config.model}
              </td>
              <td className="hidden max-w-[200px] truncate px-4 py-3 text-muted-foreground md:table-cell">
                {config.baseUrl}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {config.group?.name ?? "-"}
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                {config.requestHeaders
                  ? `${Object.keys(config.requestHeaders).length} 项`
                  : "-"}
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                {config.metadata
                  ? `${Object.keys(config.metadata).length} 项`
                  : "-"}
              </td>
              <td className="px-4 py-3">
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
              <td className="px-4 py-3">
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
