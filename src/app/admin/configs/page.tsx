"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ConfigForm } from "@/components/admin/config-form";
import { ConfigTable } from "@/components/admin/config-table";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  CheckCheck,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react";
import Link from "next/link";

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

interface GroupItem {
  id: string;
  name: string;
}

type StatusFilter = "all" | "enabled" | "disabled" | "maintenance";

export default function ConfigsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [editing, setEditing] = useState<ConfigItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [opError, setOpError] = useState("");
  const [opNotice, setOpNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setFetchError("");
    try {
      const [configRes, groupRes] = await Promise.all([
        fetch("/api/admin/configs"),
        fetch("/api/admin/groups"),
      ]);

      if (configRes.status === 401 || groupRes.status === 401) {
        router.push("/admin");
        return;
      }

      if (!configRes.ok || !groupRes.ok) {
        setFetchError(
          `加载失败 (配置: ${configRes.status}, 分组: ${groupRes.status})`
        );
        setLoading(false);
        return;
      }

      const nextConfigs = (await configRes.json()) as ConfigItem[];
      const nextGroups = (await groupRes.json()) as GroupItem[];

      setConfigs(nextConfigs);
      setGroups(nextGroups);
      setSelectedIds((current) =>
        current.filter((id) => nextConfigs.some((config) => config.id === id))
      );
    } catch {
      setFetchError("网络请求失败，请检查连接");
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (data: Record<string, unknown>) => {
    setOpError("");
    setOpNotice("");
    const method = editing ? "PUT" : "POST";
    const body = editing ? { id: editing.id, ...data } : data;

    try {
      const res = await fetch("/api/admin/configs", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        router.push("/admin");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "操作失败" }));
        setOpError(err.error || "操作失败");
        return;
      }

      setShowForm(false);
      setEditing(null);
      const payload = await res.json().catch(() => null);
      if (!editing && typeof payload?.createdCount === "number") {
        setOpNotice(`已批量创建 ${payload.createdCount} 个模型配置`);
      } else {
        setOpNotice(editing ? "配置已更新" : "配置已创建");
      }
      await fetchData();
    } catch {
      setOpError("网络请求失败");
    }
  };

  const handleDelete = async (id: string) => {
    setOpError("");
    setOpNotice("");
    try {
      const res = await fetch(`/api/admin/configs?id=${id}`, {
        method: "DELETE",
      });

      if (res.status === 401) {
        router.push("/admin");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "删除失败" }));
        setOpError(err.error || "删除失败");
        return;
      }

      setOpNotice("配置已删除");
      await fetchData();
    } catch {
      setOpError("网络请求失败");
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    setOpError("");
    setOpNotice("");
    try {
      const res = await fetch("/api/admin/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      });

      if (res.status === 401) {
        router.push("/admin");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "操作失败" }));
        setOpError(err.error || "操作失败");
        return;
      }

      setOpNotice(enabled ? "已启用配置" : "已禁用配置");
      await fetchData();
    } catch {
      setOpError("网络请求失败");
    }
  };

  const filteredConfigs = configs.filter((config) => {
    const keyword = search.trim().toLowerCase();
    const hitKeyword =
      keyword.length === 0 ||
      config.name.toLowerCase().includes(keyword) ||
      config.model.toLowerCase().includes(keyword) ||
      config.baseUrl.toLowerCase().includes(keyword) ||
      (config.group?.name ?? "").toLowerCase().includes(keyword);

    if (!hitKeyword) return false;

    switch (statusFilter) {
      case "enabled":
        return config.enabled && !config.isMaintenance;
      case "disabled":
        return !config.enabled;
      case "maintenance":
        return config.isMaintenance;
      default:
        return true;
    }
  });

  const selectedCount = selectedIds.length;
  const selectedVisibleCount = filteredConfigs.filter((config) =>
    selectedIds.includes(config.id)
  ).length;
  const allVisibleSelected =
    filteredConfigs.length > 0 &&
    filteredConfigs.every((config) => selectedIds.includes(config.id));

  const stats = {
    total: configs.length,
    enabled: configs.filter((config) => config.enabled && !config.isMaintenance)
      .length,
    maintenance: configs.filter((config) => config.isMaintenance).length,
    selected: selectedCount,
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter(
          (id) => !filteredConfigs.some((config) => config.id === id)
        )
      );
      return;
    }

    setSelectedIds((current) =>
      Array.from(new Set([...current, ...filteredConfigs.map((config) => config.id)]))
    );
  };

  const runBulkAction = async (
    actionName: string,
    executor: (id: string) => Promise<Response>
  ) => {
    if (selectedIds.length === 0) {
      setOpError("请先选择至少一个配置");
      return;
    }

    setOpError("");
    setOpNotice("");

    try {
      for (const id of selectedIds) {
        const res = await executor(id);

        if (res.status === 401) {
          router.push("/admin");
          return;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({
            error: `${actionName}失败`,
          }));
          setOpError(err.error || `${actionName}失败`);
          return;
        }
      }

      setSelectedIds([]);
      setOpNotice(`${actionName}完成，共处理 ${selectedCount} 项`);
      await fetchData();
    } catch {
      setOpError("网络请求失败");
    }
  };

  const handleBulkToggle = async (enabled: boolean) => {
    await runBulkAction(enabled ? "批量启用" : "批量禁用", (id) =>
      fetch("/api/admin/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      })
    );
  };

  const handleBulkMaintenance = async (isMaintenance: boolean) => {
    await runBulkAction(isMaintenance ? "批量开启维护模式" : "批量关闭维护模式", (id) =>
      fetch("/api/admin/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isMaintenance }),
      })
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      setOpError("请先选择至少一个配置");
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个配置吗？`)) {
      return;
    }

    await runBulkAction("批量删除", (id) =>
      fetch(`/api/admin/configs?id=${id}`, { method: "DELETE" })
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
        加载中...
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">监控配置</h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card p-8 text-center shadow-sm">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-destructive">{fetchError}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.04),rgba(15,23,42,0.01)),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_30px_80px_-36px_rgba(15,23,42,0.45)]">
        <div className="border-b border-border/60 px-6 py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
          <Link
            href="/admin"
                className="rounded-full border border-border/70 bg-background/80 p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  Provider Control
                </div>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                  监控配置台
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  支持批量导入模型、批量操作配置，并快速诊断异常原因。
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              新增配置
            </button>
          </div>
        </div>

        <div className="grid gap-3 px-6 py-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-background/90 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              总配置
            </div>
            <div className="mt-2 text-3xl font-semibold">{stats.total}</div>
          </div>
          <div className="rounded-2xl border border-status-operational/20 bg-status-operational/5 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-status-operational/80">
              已启用
            </div>
            <div className="mt-2 text-3xl font-semibold text-status-operational">
              {stats.enabled}
            </div>
          </div>
          <div className="rounded-2xl border border-status-degraded/25 bg-status-degraded/8 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-status-degraded/80">
              维护中
            </div>
            <div className="mt-2 text-3xl font-semibold text-status-degraded">
              {stats.maintenance}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/90 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              已选择
            </div>
            <div className="mt-2 text-3xl font-semibold">{stats.selected}</div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-border/60 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="按名称、模型、分组或 API 地址搜索"
              className="w-full rounded-full border border-border/70 bg-background/90 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "全部" },
              { id: "enabled", label: "已启用" },
              { id: "disabled", label: "已禁用" },
              { id: "maintenance", label: "维护中" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatusFilter(item.id as StatusFilter)}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  statusFilter === item.id
                    ? "bg-foreground text-background"
                    : "border border-border/70 bg-background/80 text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {(opError || opNotice) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            opError
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-status-operational/30 bg-status-operational/10 text-status-operational"
          }`}
        >
          {opError || opNotice}
        </div>
      )}

      {selectedCount > 0 && (
        <section className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-medium">
                已选择 {selectedCount} 项
              </div>
              <div className="text-xs text-muted-foreground">
                当前筛选结果中命中 {selectedVisibleCount} 项
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleBulkToggle(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-status-operational/30 bg-status-operational/8 px-4 py-2 text-sm text-status-operational hover:bg-status-operational/14"
              >
                <CheckCheck className="h-4 w-4" />
                批量启用
              </button>
              <button
                type="button"
                onClick={() => handleBulkToggle(false)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Ban className="h-4 w-4" />
                批量禁用
              </button>
              <button
                type="button"
                onClick={() => handleBulkMaintenance(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-status-degraded/30 bg-status-degraded/10 px-4 py-2 text-sm text-status-degraded hover:bg-status-degraded/16"
              >
                <Wrench className="h-4 w-4" />
                开启维护
              </button>
              <button
                type="button"
                onClick={() => handleBulkMaintenance(false)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ShieldCheck className="h-4 w-4" />
                关闭维护
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive hover:bg-destructive/16"
              >
                <Trash2 className="h-4 w-4" />
                批量删除
              </button>
            </div>
          </div>
        </section>
      )}

      {showForm && (
        <ConfigForm
          key={editing?.id ?? "new"}
          config={editing}
          groups={groups}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <ConfigTable
        configs={filteredConfigs}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onEdit={(c) => {
          setEditing(c);
          setShowForm(true);
        }}
        onDelete={handleDelete}
        onToggle={handleToggle}
      />
    </div>
  );
}
