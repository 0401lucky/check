"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GroupForm } from "@/components/admin/group-form";
import { ModalShell } from "@/components/admin/modal-shell";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  FolderTree,
} from "lucide-react";
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

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditing(null);
  }, []);

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

      closeForm();
      fetchGroups();
    } catch {
      setOpError("网络请求失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除该分组？分组下的配置将变为未分组状态。")) {
      return;
    }
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
      <section className="overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.04),rgba(15,23,42,0.01)),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_30px_80px_-36px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-full border border-border/70 bg-background/80 p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Group Control
              </div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                分组管理
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                统一维护分组名称、说明和排序，用于前台与后台分组展示。
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            新增分组
          </button>
        </div>
      </section>

      {opError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {opError}
        </div>
      )}

      <section className="rounded-[28px] border border-border/70 bg-card/95 shadow-[0_20px_58px_-34px_rgba(15,23,42,0.35)]">
        {groups.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            暂无分组，点击上方按钮创建
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/85 text-muted-foreground">
                    <FolderTree className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">{group.name}</div>
                    {group.description && (
                      <div className="mt-0.5 text-sm text-muted-foreground">
                        {group.description}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {group._count.configs} 个配置 · 排序: {group.sortOrder}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => {
                      setEditing(group);
                      setShowForm(true);
                    }}
                    className="rounded-full border border-border/70 bg-background/85 p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="编辑"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="rounded-full border border-border/70 bg-background/85 p-2 text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <ModalShell
          title={editing ? "编辑分组" : "新增分组"}
          description="分组会同时影响首页展示和后台按分组查看时的组织方式。"
          onClose={closeForm}
          widthClassName="max-w-3xl"
        >
          <GroupForm
            group={editing}
            onSave={handleSave}
            onCancel={closeForm}
          />
        </ModalShell>
      )}
    </div>
  );
}
