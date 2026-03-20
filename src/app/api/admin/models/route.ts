import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/admin-auth";

const API_PATH_SUFFIX_REGEX = /\/(chat\/completions|responses|models)\/?$/;

function normalizeInputUrl(input: string): string {
  const [pathWithoutQuery] = input.trim().split("?");
  return pathWithoutQuery.replace(/\/+$/, "");
}

function deriveBaseUrl(input: string): string {
  const normalized = normalizeInputUrl(input);
  return normalized.replace(API_PATH_SUFFIX_REGEX, "");
}

function normalizeModelsUrl(baseUrl: string): string {
  const trimmed = deriveBaseUrl(baseUrl);
  if (trimmed.endsWith("/models")) {
    return trimmed;
  }
  return `${trimmed}/models`;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  const message = (payload as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

function normalizeRequestHeaders(
  input: unknown
): Record<string, string> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const entries = Object.entries(input).filter(
    ([key, value]) => key.trim().length > 0 && typeof value === "string"
  );

  if (entries.length === 0) {
    return null;
  }

  return Object.fromEntries(entries);
}

export async function POST(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const baseUrl =
      typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";
    const rawApiKey =
      typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const configId =
      typeof body.configId === "string" ? body.configId.trim() : "";
    const rawRequestHeaders = normalizeRequestHeaders(body.requestHeaders);

    if (!baseUrl) {
      return NextResponse.json(
        { error: "缺少 baseUrl" },
        { status: 400 }
      );
    }

    let apiKey = rawApiKey;
    let requestHeaders = rawRequestHeaders;
    if (!apiKey && configId) {
      const config = await db.checkConfig.findUnique({
        where: { id: configId },
        select: { apiKey: true, requestHeaders: true },
      });

      if (!config) {
        return NextResponse.json(
          { error: "配置不存在" },
          { status: 404 }
        );
      }

      apiKey = config.apiKey;
      requestHeaders =
        requestHeaders ??
        normalizeRequestHeaders(config.requestHeaders);
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "缺少 apiKey" },
        { status: 400 }
      );
    }

    const modelsUrl = normalizeModelsUrl(baseUrl);
    const response = await fetch(modelsUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        ...(requestHeaders ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = extractErrorMessage(payload);
      return NextResponse.json(
        {
          error: detail
            ? `获取模型失败 (${response.status}): ${detail}`
            : `获取模型失败 (${response.status})`,
        },
        { status: response.status }
      );
    }

    const items = Array.isArray((payload as { data?: unknown[] } | null)?.data)
      ? ((payload as { data: unknown[] }).data ?? [])
      : [];

    const models = Array.from(
      new Set(
        items
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const id = (item as { id?: unknown }).id;
            return typeof id === "string" && id.trim() ? id.trim() : null;
          })
          .filter((id): id is string => Boolean(id))
      )
    ).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ models });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "获取模型失败";

    if (message.includes("timeout")) {
      return NextResponse.json(
        { error: "获取模型超时，请检查地址或网络" },
        { status: 504 }
      );
    }

    console.error("[API] 获取模型列表失败:", err);
    return NextResponse.json(
      { error: "获取模型失败" },
      { status: 500 }
    );
  }
}
