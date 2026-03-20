"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GroupForm } from "@/components/admin/group-form";
import { ArrowLeft, Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface GroupItem {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  _count: { configs: number };
}

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [editing, setEditing] = useState<GroupItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [opError, setOpError] = useState("");

  const fetchGroups = useCallback(async () => {
    setFetchError("");
    try {
      const res = await fetch("/api/admin/groups");
      if (res.status === 401) {
        router.push("/admin");
        return;
      }
      if (!res.ok) {
        setFetchError(`加载失败 (${res.status})`);
        setLoading(false);
        return;
      }
      setGroups(await res.json());
    } catch {
      setFetchError("网络请求失败，请检查连接");
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleSave = async (data: Record<string, unknown>) => {
    setOpError("");
    const method = editing ? "PUT" : "POST";
    const body = editing ? { id: editing.id, ...data } : data;

    try {
      const res = await fetch("/api/admin/groups", {
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
      fetchGroups();
    } catch {
      setOpError("网络请求失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除该分组？分组下的配置将变为未分组状态。")) return;
    setOpError("");

    try {
      const res = await fetch(`/api/admin/groups?id=${id}`, {
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

      fetchGroups();
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
          <h1 className="text-2xl font-bold">分组管理</h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card p-8 text-center shadow-sm">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-destructive">{fetchError}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchGroups();
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
          <h1 className="text-2xl font-bold">分组管理</h1>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          新增分组
        </button>
      </div>

      {opError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {opError}
        </div>
      )}

      {showForm && (
        <GroupForm
          key={editing?.id ?? "new"}
          group={editing}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <div className="rounded-xl border bg-card shadow-sm">
        {groups.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            暂无分组，点击上方按钮创建
          </div>
        ) : (
          <div className="divide-y">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div>
                  <div className="font-medium">{group.name}</div>
                  {group.description && (
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      {group.description}
                    </div>
                  )}
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {group._count.configs} 个配置 · 排序: {group.sortOrder}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditing(group);
                      setShowForm(true);
                    }}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="编辑"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
