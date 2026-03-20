"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ConfigForm } from "@/components/admin/config-form";
import { ConfigTable } from "@/components/admin/config-table";
import { ArrowLeft, Plus, AlertCircle } from "lucide-react";
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

export default function ConfigsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [editing, setEditing] = useState<ConfigItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [opError, setOpError] = useState("");

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

      setConfigs(await configRes.json());
      setGroups(await groupRes.json());
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
      fetchData();
    } catch {
      setOpError("网络请求失败");
    }
  };

  const handleDelete = async (id: string) => {
    setOpError("");
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

      fetchData();
    } catch {
      setOpError("网络请求失败");
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    setOpError("");
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

      fetchData();
    } catch {
      setOpError("网络请求失败");
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">监控配置</h1>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          新增
        </button>
      </div>

      {opError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {opError}
        </div>
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
        configs={configs}
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
