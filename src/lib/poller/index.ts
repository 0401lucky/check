import crypto from "crypto";
import { db } from "@/lib/db";
import { checkModel } from "@/lib/checker";

let pollerTimer: ReturnType<typeof setInterval> | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let lockRetryTimer: ReturnType<typeof setTimeout> | null = null;
let isRunning = false;
let isAcquiringLock = false;
let lockLost = false; // 心跳失败时置 true，通知 runChecks 尽早终止
let shutdownHooksBound = false;

const INSTANCE_ID = crypto.randomUUID();

function clampEnv(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  const v = parseInt(raw || "", 10);
  if (isNaN(v) || v < min) return fallback;
  if (v > max) return max;
  return v;
}

const POLL_INTERVAL =
  clampEnv(process.env.CHECK_POLL_INTERVAL, 60, 10, 3600) * 1000;
const CONCURRENCY = clampEnv(process.env.CHECK_CONCURRENCY, 5, 1, 20);
const RETENTION_DAYS = clampEnv(
  process.env.HISTORY_RETENTION_DAYS,
  30,
  1,
  365
);
const HEARTBEAT_INTERVAL = Math.max(Math.floor(POLL_INTERVAL / 2), 5_000);
const LOCK_RETRY_INTERVAL =
  clampEnv(process.env.CHECK_LOCK_RETRY_INTERVAL, 15, 5, 300) * 1000;

// ── 数据库分布式锁 ──

function isTableNotFoundError(err: unknown): boolean {
  if (typeof err === "object" && err !== null && "code" in err) {
    return (err as { code: string }).code === "P2021";
  }
  return false;
}

async function tryAcquireLock(): Promise<boolean> {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - POLL_INTERVAL * 3);

  try {
    try {
      await db.pollerLock.create({
        data: { id: "singleton", instanceId: INSTANCE_ID, lockedAt: now },
      });
      return true;
    } catch (createErr) {
      if (isTableNotFoundError(createErr)) throw createErr;
    }

    const refreshed = await db.pollerLock.updateMany({
      where: { id: "singleton", instanceId: INSTANCE_ID },
      data: { lockedAt: now },
    });
    if (refreshed.count > 0) return true;

    const taken = await db.pollerLock.updateMany({
      where: { id: "singleton", lockedAt: { lt: staleThreshold } },
      data: { instanceId: INSTANCE_ID, lockedAt: now },
    });
    return taken.count > 0;
  } catch (err) {
    if (isTableNotFoundError(err)) {
      console.warn("[轮询器] poller_lock 表不存在，无锁模式运行");
      return true;
    }
    console.error("[轮询器] 锁操作失败，拒绝启动:", err);
    return false;
  }
}

/** 仅刷新自己持有的锁。返回 false 表示锁已不属于自己。 */
async function refreshLock(): Promise<boolean> {
  try {
    const result = await db.pollerLock.updateMany({
      where: { id: "singleton", instanceId: INSTANCE_ID },
      data: { lockedAt: new Date() },
    });
    return result.count > 0;
  } catch (err) {
    if (isTableNotFoundError(err)) return true; // 无锁模式
    return false;
  }
}

async function releaseLock(): Promise<void> {
  try {
    await db.pollerLock.deleteMany({
      where: { id: "singleton", instanceId: INSTANCE_ID },
    });
  } catch {
    // 释放失败不阻断关闭
  }
}

function clearLockRetryTimer() {
  if (!lockRetryTimer) return;
  clearTimeout(lockRetryTimer);
  lockRetryTimer = null;
}

function scheduleLockRetry(reason: string) {
  if (process.env.ENABLE_POLLER === "false") return;
  if (pollerTimer || lockRetryTimer || isAcquiringLock) return;

  console.log(
    `[轮询器] ${reason}，${LOCK_RETRY_INTERVAL / 1000}s 后重试获取锁`
  );

  lockRetryTimer = setTimeout(() => {
    lockRetryTimer = null;
    void attemptStartPoller();
  }, LOCK_RETRY_INTERVAL);
}

function bindShutdownHooks() {
  if (shutdownHooksBound) return;
  shutdownHooksBound = true;

  const gracefulShutdown = async () => {
    await stopPoller();
    process.exit(0);
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
}

// ── 锁心跳（独立于 runChecks，保证慢轮次不会被误判过期） ──

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(async () => {
    const ok = await refreshLock();
    if (!ok) {
      await handleLockLost(
        "[轮询器] 心跳续租失败，锁已被其他实例接管或数据库暂不可用"
      );
    }
  }, HEARTBEAT_INTERVAL);
}

async function handleLockLost(message: string) {
  if (lockLost) return;

  lockLost = true;
  console.warn(message);
  await stopPoller({ retry: true, reason: "锁已丢失，切换为待命重试" });
}

// ── 检查逻辑 ──

async function runChecks() {
  if (isRunning) {
    console.log("[轮询器] 上一轮未完成，跳过本次");
    return;
  }
  if (lockLost) return;

  isRunning = true;
  try {
    const configs = await db.checkConfig.findMany({
      where: { enabled: true, isMaintenance: false },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        baseUrl: true,
        apiKey: true,
        model: true,
        requestHeaders: true,
        metadata: true,
      },
    });

    for (let i = 0; i < configs.length; i += CONCURRENCY) {
      // 每批次前检查是否丢锁
      if (lockLost) {
        console.log("[轮询器] 检测到锁丢失，中止当前轮次");
        return;
      }

      const batch = configs.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (config) => {
          const result = await checkModel(
            config.baseUrl,
            config.apiKey,
            config.model,
            (config.requestHeaders as Record<string, string> | null) ?? null,
            (config.metadata as Record<string, unknown> | null) ?? null
          );

          return { configId: config.id, result };
        })
      );

      for (const r of results) {
        if (r.status === "rejected") {
          console.error("[轮询器] 检查失败:", r.reason);
        }
      }

      if (lockLost) {
        console.log("[轮询器] 批次完成后检测到锁丢失，跳过结果落库");
        return;
      }

      const lockStillOwned = await refreshLock();
      if (!lockStillOwned) {
        await handleLockLost(
          "[轮询器] 写入历史前检测到锁已丢失，停止当前实例"
        );
        return;
      }

      const writes = await Promise.allSettled(
        results
          .filter(
            (
              item
            ): item is PromiseFulfilledResult<{
              configId: string;
              result: Awaited<ReturnType<typeof checkModel>>;
            }> => item.status === "fulfilled"
          )
          .map((item) =>
            db.checkHistory.create({
              data: {
                configId: item.value.configId,
                status: item.value.result.status,
                latency: item.value.result.latency,
                errorMessage: item.value.result.errorMessage,
              },
            })
          )
      );

      for (const write of writes) {
        if (write.status === "rejected") {
          console.error("[轮询器] 写入历史失败:", write.reason);
        }
      }
    }
  } catch (err) {
    console.error("[轮询器] 执行出错:", err);
  } finally {
    isRunning = false;
  }
}

async function cleanupHistory() {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const result = await db.checkHistory.deleteMany({
      where: { checkedAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      console.log(`[轮询器] 清理了 ${result.count} 条过期历史记录`);
    }
  } catch (err) {
    console.error("[轮询器] 清理历史记录失败:", err);
  }
}

// ── 生命周期 ──

async function attemptStartPoller() {
  if (pollerTimer || isAcquiringLock) return;
  if (process.env.ENABLE_POLLER === "false") {
    clearLockRetryTimer();
    console.log("[轮询器] 已通过 ENABLE_POLLER=false 禁用");
    return;
  }

  let shouldRetry = false;
  isAcquiringLock = true;

  try {
    const acquired = await tryAcquireLock();
    if (!acquired) {
      shouldRetry = true;
      return;
    }

    clearLockRetryTimer();
    lockLost = false;

    console.log(
      `[轮询器] 启动 (实例: ${INSTANCE_ID.slice(0, 8)})，间隔 ${POLL_INTERVAL / 1000}s，并发 ${CONCURRENCY}，保留 ${RETENTION_DAYS} 天`
    );

    // 独立心跳线程，保证慢轮次期间锁不过期
    startHeartbeat();

    void runChecks();
    pollerTimer = setInterval(() => {
      void runChecks();
    }, POLL_INTERVAL);
    cleanupTimer = setInterval(() => {
      void cleanupHistory();
    }, 24 * 60 * 60 * 1000);
  } finally {
    isAcquiringLock = false;

    if (shouldRetry) {
      scheduleLockRetry("当前未获取到轮询锁，其他实例可能仍在运行");
    }
  }
}

export async function startPoller() {
  bindShutdownHooks();
  await attemptStartPoller();
}

export async function stopPoller(options?: {
  retry?: boolean;
  reason?: string;
}) {
  const shouldRetry = options?.retry ?? false;

  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
  }
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  if (!shouldRetry) {
    clearLockRetryTimer();
  }

  await releaseLock();

  if (shouldRetry) {
    console.log("[轮询器] 已停止当前轮询并释放锁，进入待命重试");
    scheduleLockRetry(options?.reason ?? "轮询器已停止");
    return;
  }

  console.log("[轮询器] 已停止并释放锁");
}
