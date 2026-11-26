export const PRIMARY_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
export const FALLBACK_MODEL = "nvidia/nemotron-3.5-super-vl:free";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type ModelErrorKind =
  | "no-key"
  | "timeout"
  | "aborted"
  | "network"
  | "http-4xx"
  | "http-429"
  | "http-5xx"
  | "empty"
  | "bad-response";

export class ModelCallError extends Error {
  readonly model: string;
  readonly kind: ModelErrorKind;

  constructor(model: string, kind: ModelErrorKind) {
    super(`model call failed: ${kind}`);
    this.name = "ModelCallError";
    this.model = model;
    this.kind = kind;
  }
}

/** 모델명과 오류 종류만 남긴다. 키, 프롬프트, 응답 본문은 남기지 않는다. */
function fail(model: string, kind: ModelErrorKind): never {
  console.warn(`[ai] model=${model} error=${kind}`);
  throw new ModelCallError(model, kind);
}

function statusKind(status: number): ModelErrorKind {
  if (status === 429) return "http-429";
  if (status >= 500) return "http-5xx";
  return "http-4xx";
}

export async function callModel(
  model: string,
  messages: ChatMessage[],
  opts: { timeoutMs: number; signal?: AbortSignal },
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) fail(model, "no-key");

  const timeoutSignal = AbortSignal.timeout(opts.timeoutMs);
  const signal = opts.signal ? AbortSignal.any([timeoutSignal, opts.signal]) : timeoutSignal;

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages }),
      signal,
    });
  } catch {
    if (timeoutSignal.aborted) fail(model, "timeout");
    if (opts.signal?.aborted) fail(model, "aborted");
    fail(model, "network");
  }

  if (!res.ok) fail(model, statusKind(res.status));

  let content: unknown;
  try {
    const data = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    content = data?.choices?.[0]?.message?.content;
  } catch {
    if (timeoutSignal.aborted) fail(model, "timeout");
    fail(model, "bad-response");
  }

  if (typeof content !== "string" || content.trim() === "") fail(model, "empty");
  return content;
}
