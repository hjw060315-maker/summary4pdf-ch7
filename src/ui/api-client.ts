import { ERROR_MESSAGES, type ErrorCode } from "@/shared/errors";
import type { Summary, SummaryLength } from "@/shared/types";
import { mockSummary } from "./mock";

export const NETWORK_MESSAGE = "연결에 문제가 있어요. 잠시 후 다시 시도해 주세요";

export class ApiClientError extends Error {
  readonly code: ErrorCode | "NETWORK";

  constructor(code: ErrorCode | "NETWORK", message: string) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function summarizePdf(
  file: File,
  length: SummaryLength,
  options: { mockDelayMs?: number } = {},
): Promise<Summary> {
  if (process.env.NEXT_PUBLIC_API_MODE === "mock") {
    await sleep(options.mockDelayMs ?? 1500);
    return mockSummary(length);
  }

  const body = new FormData();
  body.append("file", file);
  body.append("length", length);

  let res: Response;
  try {
    res = await fetch("/api/summarize", { method: "POST", body });
  } catch {
    throw new ApiClientError("NETWORK", NETWORK_MESSAGE);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = undefined;
  }

  if (res.ok && data && typeof data === "object" && "oneLine" in data) {
    return data as Summary;
  }

  const err = (data as { error?: { code?: unknown; message?: unknown } } | undefined)?.error;
  if (err && typeof err.code === "string" && typeof err.message === "string") {
    throw new ApiClientError(err.code as ErrorCode, err.message);
  }
  if (res.status === 413) {
    throw new ApiClientError("FILE_TOO_LARGE", ERROR_MESSAGES.FILE_TOO_LARGE);
  }
  throw new ApiClientError("INTERNAL", ERROR_MESSAGES.INTERNAL);
}
