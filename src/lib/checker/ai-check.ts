import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { CheckResult, CheckStatus } from "./types";

const DEGRADED_THRESHOLD_MS = 6000;
const TIMEOUT_MS = 30000;
const API_PATH_SUFFIX_REGEX = /\/(chat\/completions|responses|models)\/?$/;
const EXCLUDED_METADATA_KEYS = new Set([
  "model",
  "prompt",
  "messages",
  "abortSignal",
]);

function normalizeInputUrl(input: string): string {
  const [pathWithoutQuery] = input.trim().split("?");
  return pathWithoutQuery.replace(/\/+$/, "");
}

function deriveBaseUrl(input: string): string {
  const normalized = normalizeInputUrl(input);
  return normalized.replace(API_PATH_SUFFIX_REGEX, "");
}

function isResponsesEndpoint(input: string): boolean {
  return /\/responses\/?$/.test(normalizeInputUrl(input));
}

function normalizeRequestHeaders(
  headers: Record<string, string> | null | undefined
): Record<string, string> {
  if (!headers) return {};

  return Object.fromEntries(
    Object.entries(headers).filter(
      ([key, value]) => key.trim().length > 0 && value.trim().length > 0
    )
  );
}

function normalizeMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!metadata) return null;

  const filtered = Object.fromEntries(
    Object.entries(metadata).filter(
      ([key]) => !EXCLUDED_METADATA_KEYS.has(key)
    )
  );

  return Object.keys(filtered).length > 0 ? filtered : null;
}

/**
 * 规范化模型输出，兼容全角数字和常见标点。
 */
function normalizeAnswerText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    )
    .replace(/[`"'“”‘’]/g, "")
    .replace(/\s+/g, "");
}

/**
 * 校验模型响应是否包含正确答案。
 * 兼容 "2"、"答案是2"、"1+1=2" 等常见正确格式，
 * 避免因格式差异把真实可用的接口误判成失败。
 */
function isAnswerCorrect(text: string): boolean {
  const normalized = normalizeAnswerText(text)
    .replace(/^[=：:\-]+/, "")
    .replace(/[。．.!?！？,，、；;:：]+$/g, "");

  if (!normalized) {
    return false;
  }

  if (normalized === "2" || normalized === "two") {
    return true;
  }

  if (
    /^(答案|结果|answer|result|theansweris|answeris|resultis|its|itis)?[:：=]?(2|two)$/.test(
      normalized
    )
  ) {
    return true;
  }

  if (/^1\+1=?2$/.test(normalized) || /^1加1(等于|是)?2$/.test(normalized)) {
    return true;
  }

  return /answer[:：=]2/.test(normalized);
}

export async function checkModel(
  baseUrl: string,
  apiKey: string,
  model: string,
  requestHeaders?: Record<string, string> | null,
  metadata?: Record<string, unknown> | null
): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const normalizedBaseUrl = deriveBaseUrl(baseUrl);
    const customHeaders = normalizeRequestHeaders(requestHeaders);
    const customMetadata = normalizeMetadata(metadata);
    const provider = createOpenAI({
      baseURL: normalizedBaseUrl,
      apiKey,
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers);
        for (const [key, value] of Object.entries(customHeaders)) {
          headers.set(key, value);
        }

        if (
          customMetadata &&
          init?.method?.toUpperCase() === "POST" &&
          typeof init.body === "string"
        ) {
          try {
            const originalBody = JSON.parse(init.body) as Record<
              string,
              unknown
            >;
            return fetch(input, {
              ...init,
              headers,
              body: JSON.stringify({
                ...originalBody,
                ...customMetadata,
              }),
            });
          } catch {
            // 保留原始 body，避免因解析失败中断请求
          }
        }

        return fetch(input, {
          ...init,
          headers,
        });
      },
    });

    const { text } = await generateText({
      model: isResponsesEndpoint(baseUrl)
        ? provider.responses(model)
        : provider.chat(model),
      prompt: "请计算：1+1等于几？只输出最终答案 2，不要输出解释、算式或标点。",
      maxOutputTokens: 10,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const latency = Date.now() - startTime;

    if (!text || text.trim().length === 0) {
      return {
        status: "failed",
        latency,
        errorMessage: "空响应",
      };
    }

    if (!isAnswerCorrect(text)) {
      return {
        status: "failed",
        latency,
        errorMessage: `答案错误: "${text.trim().slice(0, 100)}"`,
      };
    }

    const status: CheckStatus =
      latency > DEGRADED_THRESHOLD_MS ? "degraded" : "operational";

    return { status, latency, errorMessage: null };
  } catch (err) {
    const latency = Date.now() - startTime;
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    if (
      errorMessage.includes("abort") ||
      errorMessage.includes("timeout") ||
      latency >= TIMEOUT_MS
    ) {
      return {
        status: "failed",
        latency,
        errorMessage: `超时 (${TIMEOUT_MS}ms)`,
      };
    }

    return {
      status: "error",
      latency: null,
      errorMessage: errorMessage.slice(0, 500),
    };
  }
}
