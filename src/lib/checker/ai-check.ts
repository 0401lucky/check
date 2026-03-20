import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { CheckResult, CheckStatus } from "./types";

const DEGRADED_THRESHOLD_MS = 6000;
const TIMEOUT_MS = 30000;
const API_PATH_SUFFIX_REGEX = /\/(chat\/completions|responses|models)\/?$/;

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

/**
 * 校验模型响应是否包含正确答案。
 * 提取响应中的所有数字字符，期望仅出现一个 "2"。
 */
function isAnswerCorrect(text: string): boolean {
  const digits = text.match(/\d/g) ?? [];
  return digits.length === 1 && digits[0] === "2";
}

export async function checkModel(
  baseUrl: string,
  apiKey: string,
  model: string,
  requestHeaders?: Record<string, string> | null
): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const normalizedBaseUrl = deriveBaseUrl(baseUrl);
    const customHeaders = normalizeRequestHeaders(requestHeaders);
    const provider = createOpenAI({
      baseURL: normalizedBaseUrl,
      apiKey,
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers);
        for (const [key, value] of Object.entries(customHeaders)) {
          headers.set(key, value);
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
      prompt: "请计算：1+1等于几？只回答数字。",
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
