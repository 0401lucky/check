"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Settings, FolderOpen, Shield, LogOut } from "lucide-react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  // 检查现有 cookie 是否有效
  useEffect(() => {
    fetch("/api/admin/auth")
      .then((res) => setAuthed(res.ok))
      .catch(() => setAuthed(false));
  }, []);

  const handleLogin = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthed(true);
        setPassword("");
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `登录失败 (${res.status})`);
      }
    } catch {
      setError("网络请求失败");
    }
  }, [password]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthed(false);
  }, []);

  // 加载中
  if (authed === null) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
        验证中...
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">管理后台</h1>
          </div>
          <div>
            <input
              type="password"
              placeholder="请输入管理密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">管理后台</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/configs"
          className="flex items-center gap-4 rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">监控配置</h2>
            <p className="text-sm text-muted-foreground">
              管理 AI 模型端点、API Key 和检测参数
            </p>
          </div>
        </Link>
        <Link
          href="/admin/groups"
          className="flex items-center gap-4 rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <FolderOpen className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">分组管理</h2>
            <p className="text-sm text-muted-foreground">
              创建和管理模型分组，便于分类展示
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
