import crypto from "crypto";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const COOKIE_NAME = "admin-session";

// ── Token 签发与校验（含 DB session epoch） ──

function getSecret(): string {
  return crypto
    .createHmac("sha256", "jiance-session-secret")
    .update(process.env.ADMIN_PASSWORD || "")
    .digest("hex");
}

const SESSION_ID = "singleton";

async function getSession() {
  try {
    return await db.adminSession.findUnique({
      where: { id: SESSION_ID },
    });
  } catch {
    return null;
  }
}

async function ensureSessionRow() {
  try {
    const existing = await getSession();
    if (existing) return existing;

    return await db.adminSession.create({
      data: {
        id: SESSION_ID,
        epoch: 0,
        failedAttempts: 0,
      },
    });
  } catch {
    return null;
  }
}

async function getCurrentEpoch(): Promise<number> {
  const session = await ensureSessionRow();
  return session?.epoch ?? 0;
}

export async function bumpEpoch(): Promise<void> {
  try {
    await db.adminSession.upsert({
      where: { id: SESSION_ID },
      create: {
        id: SESSION_ID,
        epoch: 1,
        failedAttempts: 0,
      },
      update: {
        epoch: { increment: 1 },
        failedAttempts: 0,
        windowStart: null,
      },
    });
  } catch {
    // 表不存在时忽略
  }
}

export async function clearFailedAttempts(): Promise<void> {
  try {
    await db.adminSession.upsert({
      where: { id: SESSION_ID },
      create: { id: SESSION_ID, epoch: 0, failedAttempts: 0 },
      update: { failedAttempts: 0, windowStart: null },
    });
  } catch {
    // 表不存在时忽略
  }
}

export async function createSessionToken(): Promise<string> {
  const nonce = crypto.randomBytes(16).toString("hex");
  const epoch = await getCurrentEpoch();
  const expiry = Date.now() + 86400_000;
  const payload = `${nonce}:${epoch}:${expiry}`;
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return `${payload}:${sig}`;
}

async function verifyToken(token: string): Promise<boolean> {
  const parts = token.split(":");
  if (parts.length !== 4) return false;

  const [nonce, epochStr, expiryStr, sig] = parts;
  void nonce;

  const tokenEpoch = parseInt(epochStr, 10);
  const expiry = parseInt(expiryStr, 10);
  if (isNaN(tokenEpoch) || isNaN(expiry)) return false;
  if (Date.now() > expiry) return false;

  const currentEpoch = await getCurrentEpoch();
  if (tokenEpoch !== currentEpoch) return false;

  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(`${nonce}:${epochStr}:${expiryStr}`)
    .digest("hex");

  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export async function verifyAuth(request: NextRequest): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) return false;
  const cookie = request.cookies.get(COOKIE_NAME);
  if (!cookie?.value) return false;
  return verifyToken(cookie.value);
}

// ── 登录限速（全局存 DB，跨实例 + 跨重启） ──

const GLOBAL_MAX = 20;
const GLOBAL_WINDOW_MS = 60_000; // 1 分钟

export async function recordFailedAttempt(): Promise<{
  limited: boolean;
  retryAfter?: number;
}> {
  try {
    const rows = await db.$queryRaw<
      Array<{ failedAttempts: number; retryAfter: number }>
    >`
      INSERT INTO "admin_session" (
        "id",
        "epoch",
        "failed_attempts",
        "window_start"
      )
      VALUES (
        ${SESSION_ID},
        0,
        1,
        NOW()
      )
      ON CONFLICT ("id") DO UPDATE
      SET
        "failed_attempts" = CASE
          WHEN "admin_session"."window_start" IS NULL
            OR "admin_session"."window_start" < NOW() - (${GLOBAL_WINDOW_MS} * INTERVAL '1 millisecond')
            THEN 1
          ELSE "admin_session"."failed_attempts" + 1
        END,
        "window_start" = CASE
          WHEN "admin_session"."window_start" IS NULL
            OR "admin_session"."window_start" < NOW() - (${GLOBAL_WINDOW_MS} * INTERVAL '1 millisecond')
            THEN NOW()
          ELSE "admin_session"."window_start"
        END
      RETURNING
        "failed_attempts" AS "failedAttempts",
        GREATEST(
          CEIL(
            EXTRACT(
              EPOCH FROM (
                COALESCE("window_start", NOW()) + (${GLOBAL_WINDOW_MS} * INTERVAL '1 millisecond') - NOW()
              )
            )
          )::int,
          1
        ) AS "retryAfter"
    `;

    const state = rows[0];
    if (!state) {
      return { limited: false };
    }

    return {
      limited: state.failedAttempts >= GLOBAL_MAX,
      retryAfter: state.retryAfter,
    };
  } catch {
    // DB 不可用时放行，避免锁死管理入口
    return { limited: false };
  }
}
