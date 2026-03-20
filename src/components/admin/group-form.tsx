"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface GroupFormProps {
  group: {
    name: string;
    description: string | null;
    sortOrder: number;
  } | null;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function GroupForm({ group, onSave, onCancel }: GroupFormProps) {
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(
    group?.description ?? ""
  );
  const [sortOrder, setSortOrder] = useState(group?.sortOrder ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description: description || null,
      sortOrder,
    });
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {group ? "编辑分组" : "新增分组"}
        </h2>
        <button
          onClick={onCancel}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              分组名称 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: OpenAI 官方"
              required
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
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
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">描述</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="可选，分组说明"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
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
            {group ? "保存" : "创建"}
          </button>
        </div>
      </form>
    </div>
  );
}
