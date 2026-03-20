import { db } from "@/lib/db";
import type {
  DashboardData,
  DashboardConfig,
  DashboardGroup,
  DashboardHistoryEntry,
  CheckStatus,
} from "@/lib/checker/types";

let cachedData: DashboardData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10_000;

const POLL_INTERVAL_S = Math.max(
  parseInt(process.env.CHECK_POLL_INTERVAL || "60", 10),
  10
);

interface UptimeStats {
  uptimePercent7d: number | null;
  uptimePercent15d: number | null;
  uptimePercent30d: number | null;
}

/**
 * 计算可用率。
 * 分母 = max(实际记录数, 期望采样数)
 * 期望采样数 = min(配置存活时长, 窗口时长) / 轮询间隔
 * 这样轮询器停摆期间的缺失采样被隐式计为不可用。
 */
async function calculateUptime(
  configIds: string[],
  configEnabledAtMap: Map<string, Date>
): Promise<Map<string, UptimeStats>> {
  const result = new Map<string, UptimeStats>();
  if (configIds.length === 0) return result;

  const now = Date.now();
  const windows = [
    { key: "7d" as const, ms: 7 * 86400_000, cutoff: new Date(now - 7 * 86400_000) },
    { key: "15d" as const, ms: 15 * 86400_000, cutoff: new Date(now - 15 * 86400_000) },
    { key: "30d" as const, ms: 30 * 86400_000, cutoff: new Date(now - 30 * 86400_000) },
  ];

  const [stats7d, stats15d, stats30d] = await Promise.all(
    windows.map((w) =>
      db.checkHistory.groupBy({
        by: ["configId", "status"],
        where: { configId: { in: configIds }, checkedAt: { gte: w.cutoff } },
        _count: { _all: true },
      })
    )
  );

  const allStats = [stats7d, stats15d, stats30d];

  function processStats(
    rows: { configId: string; status: string; _count: { _all: number } }[]
  ): Map<string, { total: number; up: number }> {
    const map = new Map<string, { total: number; up: number }>();
    for (const row of rows) {
      const cur = map.get(row.configId) ?? { total: 0, up: 0 };
      cur.total += row._count._all;
      if (row.status === "operational" || row.status === "degraded") {
        cur.up += row._count._all;
      }
      map.set(row.configId, cur);
    }
    return map;
  }

  const maps = allStats.map(processStats);

  function pct(
    m: Map<string, { total: number; up: number }>,
    id: string,
    windowMs: number
  ): number | null {
    const s = m.get(id);
    const enabledAt = configEnabledAtMap.get(id);

    // 配置实际监控时长（从最近一次启用算起，不超过窗口时长）
    const ageSinceEnabled = enabledAt
      ? Math.max(0, now - enabledAt.getTime())
      : windowMs;
    const effectiveWindowMs = Math.min(ageSinceEnabled, windowMs);

    // 期望采样数
    const expectedSamples = Math.floor(effectiveWindowMs / (POLL_INTERVAL_S * 1000));

    if (expectedSamples <= 0) return null;

    const actualTotal = s?.total ?? 0;
    const up = s?.up ?? 0;

    // 分母取 max(实际记录数, 期望采样数)，缺失的采样隐式算作不可用
    const denominator = Math.max(actualTotal, expectedSamples);

    return Math.round((up / denominator) * 10000) / 100;
  }

  for (const id of configIds) {
    result.set(id, {
      uptimePercent7d: pct(maps[0], id, windows[0].ms),
      uptimePercent15d: pct(maps[1], id, windows[1].ms),
      uptimePercent30d: pct(maps[2], id, windows[2].ms),
    });
  }

  return result;
}

export async function getDashboardData(): Promise<DashboardData> {
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_TTL) {
    return cachedData;
  }

  const groups = await db.group.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      configs: {
        where: { enabled: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          model: true,
          isMaintenance: true,
          enabledAt: true,
          history: {
            orderBy: { checkedAt: "desc" },
            take: 60,
          },
        },
      },
    },
  });

  const ungroupedConfigs = await db.checkConfig.findMany({
    where: { enabled: true, groupId: null },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      model: true,
      isMaintenance: true,
      enabledAt: true,
      history: {
        orderBy: { checkedAt: "desc" },
        take: 60,
      },
    },
  });

  // 收集配置 ID 和启用时间（用于可用率期望采样计算）
  const allConfigs = [
    ...groups.flatMap((g) => g.configs),
    ...ungroupedConfigs,
  ];
  const allConfigIds = allConfigs.map((c) => c.id);
  const configEnabledAtMap = new Map(
    allConfigs.map((c) => [c.id, c.enabledAt])
  );

  const uptimeMap = await calculateUptime(allConfigIds, configEnabledAtMap);

  function mapConfig(
    config: typeof ungroupedConfigs[number]
  ): DashboardConfig {
    const latest = config.history[0];
    const historyEntries: DashboardHistoryEntry[] = config.history.map(
      (h) => ({
        status: h.status as CheckStatus,
        latency: h.latency,
        errorMessage: h.errorMessage,
        checkedAt: h.checkedAt.toISOString(),
      })
    );

    const uptime = uptimeMap.get(config.id) ?? {
      uptimePercent7d: null,
      uptimePercent15d: null,
      uptimePercent30d: null,
    };

    return {
      id: config.id,
      name: config.name,
      model: config.model,
      currentStatus: config.isMaintenance
        ? "maintenance"
        : (latest?.status as CheckStatus) ?? "error",
      currentMessage: config.isMaintenance
        ? "配置处于维护模式"
        : latest?.errorMessage ?? null,
      isMaintenance: config.isMaintenance,
      latency: config.isMaintenance ? null : latest?.latency ?? null,
      lastCheckedAt: config.isMaintenance
        ? null
        : latest?.checkedAt.toISOString() ?? null,
      uptimePercent7d: config.isMaintenance ? null : uptime.uptimePercent7d,
      uptimePercent15d: config.isMaintenance ? null : uptime.uptimePercent15d,
      uptimePercent30d: config.isMaintenance ? null : uptime.uptimePercent30d,
      history: historyEntries,
    };
  }

  const dashboardGroups: DashboardGroup[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    configs: g.configs.map(mapConfig),
  }));

  const data: DashboardData = {
    groups: dashboardGroups,
    ungrouped: ungroupedConfigs.map(mapConfig),
    lastUpdated: new Date().toISOString(),
  };

  cachedData = data;
  cacheTimestamp = now;

  return data;
}

export function invalidateCache() {
  cachedData = null;
  cacheTimestamp = 0;
}
