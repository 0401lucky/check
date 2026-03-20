import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { invalidateCache } from "@/lib/dashboard";
import { verifyAuth } from "@/lib/admin-auth";

function maskApiKey(key: string): string {
  if (key.length <= 8) return "***";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

function stripSensitive(config: Record<string, unknown>) {
  const { apiKey, ...rest } = config;
  return { ...rest, apiKey: maskApiKey(String(apiKey ?? "")) };
}

function parseRequestHeaders(
  value: unknown
): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value).filter(
    ([key, headerValue]) =>
      key.trim().length > 0 && typeof headerValue === "string"
  );

  return entries.length > 0
    ? Object.fromEntries(entries)
    : null;
}

function toCreateRequestHeaders(value: unknown) {
  const parsed = parseRequestHeaders(value);
  return parsed ?? undefined;
}

function toUpdateRequestHeaders(value: unknown) {
  const parsed = parseRequestHeaders(value);
  return parsed ?? Prisma.DbNull;
}

export async function GET(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const configs = await db.checkConfig.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { group: true },
    });

    return NextResponse.json(configs.map((c) => stripSensitive(c as unknown as Record<string, unknown>)));
  } catch (err) {
    console.error("[API] 获取配置列表失败:", err);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      model,
      baseUrl,
      apiKey,
      requestHeaders,
      groupId,
      enabled,
      sortOrder,
    } = body;

    if (!name || !model || !baseUrl || !apiKey) {
      return NextResponse.json(
        { error: "缺少必填字段：name, model, baseUrl, apiKey" },
        { status: 400 }
      );
    }

    const config = await db.checkConfig.create({
      data: {
        name: String(name),
        model: String(model),
        baseUrl: String(baseUrl),
        apiKey: String(apiKey),
        requestHeaders: toCreateRequestHeaders(requestHeaders),
        groupId: groupId ? String(groupId) : null,
        enabled: enabled ?? true,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });

    invalidateCache();
    return NextResponse.json(
      stripSensitive(config as unknown as Record<string, unknown>),
      { status: 201 }
    );
  } catch (err) {
    console.error("[API] 创建配置失败:", err);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      name,
      model,
      baseUrl,
      apiKey,
      requestHeaders,
      groupId,
      enabled,
      sortOrder,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    // 白名单字段
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name);
    if (model !== undefined) data.model = String(model);
    if (baseUrl !== undefined) data.baseUrl = String(baseUrl);
    if (apiKey) data.apiKey = String(apiKey);
    if (requestHeaders !== undefined) {
      data.requestHeaders = toUpdateRequestHeaders(requestHeaders);
    }
    if (groupId !== undefined) data.groupId = groupId ? String(groupId) : null;
    if (enabled !== undefined) {
      const newEnabled = Boolean(enabled);
      data.enabled = newEnabled;
      // 从禁用切到启用时，重置 enabledAt，避免禁用期间被算作故障
      if (newEnabled) {
        const existing = await db.checkConfig.findUnique({
          where: { id: String(id) },
          select: { enabled: true },
        });
        if (existing && !existing.enabled) {
          data.enabledAt = new Date();
        }
      }
    }
    if (sortOrder !== undefined) data.sortOrder = typeof sortOrder === "number" ? sortOrder : 0;

    const config = await db.checkConfig.update({
      where: { id: String(id) },
      data,
    });

    invalidateCache();
    return NextResponse.json(
      stripSensitive(config as unknown as Record<string, unknown>)
    );
  } catch (err) {
    console.error("[API] 更新配置失败:", err);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    await db.checkConfig.delete({ where: { id } });
    invalidateCache();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] 删除配置失败:", err);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
