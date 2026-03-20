"use client";

import type { DashboardHistoryEntry } from "@/lib/checker/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

const statusColorMap: Record<string, string> = {
  operational: "bg-status-operational",
  degraded: "bg-status-degraded",
  failed: "bg-status-failed",
  maintenance: "bg-status-degraded",
  error: "bg-status-error",
};

const statusLabelMap: Record<string, string> = {
  operational: "正常",
  degraded: "缓慢",
  failed: "故障",
  maintenance: "维护中",
  error: "异常",
};

export function StatusTimeline({
  history,
}: {
  history: DashboardHistoryEntry[];
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 最多显示 60 条，从旧到新
  const entries = [...history].reverse().slice(-60);

  return (
    <div className="relative">
      <div className="flex items-center gap-[2px]">
        {entries.map((entry, i) => (
          <div
            key={i}
            className="relative flex-1"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className={cn(
                "h-8 rounded-[2px] transition-opacity",
                statusColorMap[entry.status] ?? "bg-muted",
                hoveredIndex === i ? "opacity-80" : "opacity-100"
              )}
            />
            {hoveredIndex === i && (
              <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md">
                <div className="font-medium">
                  {statusLabelMap[entry.status] ?? entry.status}
                </div>
                {entry.latency != null && (
                  <div className="text-muted-foreground">
                    延迟: {entry.latency}ms
                  </div>
                )}
                {entry.errorMessage && (
                  <div className="max-w-[220px] whitespace-normal break-words text-muted-foreground">
                    {entry.errorMessage}
                  </div>
                )}
                <div className="text-muted-foreground">
                  {new Date(entry.checkedAt).toLocaleString("zh-CN")}
                </div>
              </div>
            )}
          </div>
        ))}
        {/* 如果记录不足 60 条，用空白填充 */}
        {Array.from({ length: Math.max(0, 60 - entries.length) }).map(
          (_, i) => (
            <div key={`empty-${i}`} className="flex-1">
              <div className="h-8 rounded-[2px] bg-muted/50" />
            </div>
          )
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>较早</span>
        <span>最近</span>
      </div>
    </div>
  );
}
