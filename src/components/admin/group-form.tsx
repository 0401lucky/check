"use client";

import { useState } from "react";

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
  const [description, setDescription] = useState(group?.description ?? "");
  const [sortOrder, setSortOrder] = useState(group?.sortOrder ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      sortOrder,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            分组名称 <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如: OpenAI 官方"
            required
            className="w-full rounded-2xl border border-border/70 bg-background/90 px-4 py-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">排序权重</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            className="w-full rounded-2xl border border-border/70 bg-background/90 px-4 py-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="可选，分组说明"
          rows={4}
          className="w-full rounded-2xl border border-border/70 bg-background/90 px-4 py-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="flex justify-end gap-3 border-t border-border/70 pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border/70 px-5 py-2.5 text-sm transition-colors hover:bg-accent"
        >
          取消
        </button>
        <button
          type="submit"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {group ? "保存修改" : "创建分组"}
        </button>
      </div>
    </form>
  );
}
