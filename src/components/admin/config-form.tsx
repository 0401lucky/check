"use client";

import { useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";

interface ConfigFormProps {
  config: {
    id?: string;
    name: string;
    model: string;
    baseUrl: string;
    apiKey: string;
    groupId: string | null;
    enabled: boolean;
    sortOrder: number;
  } | null;
  groups: { id: string; name: string }[];
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function ConfigForm({
  config,
  groups,
  onSave,
  onCancel,
}: ConfigFormProps) {
  const [name, setName] = useState(config?.name ?? "");
  const [model, setModel] = useState(config?.model ?? "");
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [groupId, setGroupId] = useState(config?.groupId ?? "");
  const [enabled, setEnabled] = useState(config?.enabled ?? true);
  const [sortOrder, setSortOrder] = useState(config?.sortOrder ?? 0);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchModelsError, setFetchModelsError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {
      name,
      model,
      baseUrl,
      groupId: groupId || null,
      enabled,
      sortOrder,
    };
    // 只在新建或填写了 apiKey 时才传
    if (apiKey) data.apiKey = apiKey;
    if (!config) data.apiKey = apiKey; // 新建时必传
    onSave(data);
  };

  const handleFetchModels = async () => {
    setFetchModelsError("");

    if (!baseUrl.trim()) {
      setFetchModelsError("请先填写 API 地址");
      return;
    }

    if (!apiKey.trim() && !config?.id) {
      setFetchModelsError("请先填写 API Key");
      return;
    }

    setFetchingModels(true);
    try {
      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim() || undefined,
          configId: config?.id,
        }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setFetchModelsError(body?.error ?? "获取模型失败");
        return;
      }

      const models = Array.isArray(body?.models)
        ? body.models.filter(
            (item: unknown): item is string =>
              typeof item === "string" && item.trim().length > 0
          )
        : [];

      setModelOptions(models);

      if (models.length === 0) {
        setFetchModelsError("接口返回了空模型列表");
        return;
      }

      if (!model.trim()) {
        const firstModel = models[0];
        setModel(firstModel);
        if (!name.trim()) {
          setName(firstModel);
        }
      }
    } catch {
      setFetchModelsError("网络请求失败");
    } finally {
      setFetchingModels(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {config ? "编辑配置" : "新增配置"}
        </h2>
        <button
          onClick={onCancel}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            显示名称 <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如: GPT-4o"
            required
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            API 地址 (OpenAI 兼容) <span className="text-destructive">*</span>
          </label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value);
              setModelOptions([]);
              setFetchModelsError("");
            }}
            placeholder="例如: https://api.openai.com/v1"
            required
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            API Key{" "}
            {!config && <span className="text-destructive">*</span>}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setModelOptions([]);
              setFetchModelsError("");
            }}
            placeholder={config ? "留空则不修改" : "sk-..."}
            required={!config}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            模型标识符 <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="例如: gpt-4o"
            required
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleFetchModels}
              disabled={fetchingModels}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {fetchingModels ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {fetchingModels ? "获取中..." : "获取模型"}
            </button>
            {modelOptions.length > 0 && (
              <select
                value={modelOptions.includes(model) ? model : ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setModel(value);
                  if (!name.trim()) {
                    setName(value);
                  }
                }}
                className="min-w-[220px] rounded-lg border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">从已获取模型中选择</option>
                {modelOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            先填写 URL 和 Key，再点击“获取模型”。编辑已有配置时，不重新填写 Key 也可读取已保存配置的模型列表。
          </div>
          {fetchModelsError && (
            <div className="mt-1 text-xs text-destructive">
              {fetchModelsError}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">所属分组</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">无分组</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">排序权重</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <span className="text-sm">启用监控</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
          >
            取消
          </button>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {config ? "保存" : "创建"}
          </button>
        </div>
      </form>
    </div>
  );
}
