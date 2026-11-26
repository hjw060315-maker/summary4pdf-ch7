import { AiDeadlineError, AiUnavailableError } from "@/shared/ai-contract";
import type { Summarize } from "@/shared/ai-contract";
import { DEADLINE_MS, MAX_PAGES } from "@/shared/constants";
import { AppError } from "@/shared/errors";
import type { Summary } from "@/shared/types";
import { checkFileBasics, parseLength } from "@/shared/validation";

export interface SummarizeDeps {
  extractText: (data: Uint8Array) => Promise<{ text: string; pageCount: number }>;
  countPages: (data: Uint8Array) => Promise<number>;
  summarize: Summarize;
  now: () => number;
  signal?: AbortSignal;
}

const MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

function isFileLike(v: unknown): v is File {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as File).size === "number" &&
    typeof (v as File).arrayBuffer === "function"
  );
}

/** 오류를 AppError로 바꾼다. 알 수 없는 오류는 이름만 로그에 남기고 내용은 숨긴다. */
function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  if (e instanceof AiUnavailableError) return new AppError("AI_BUSY");
  if (e instanceof AiDeadlineError) return new AppError("TIMEOUT");
  console.error("summarize failed:", e instanceof Error ? e.name : "UnknownError");
  return new AppError("INTERNAL");
}

export async function runSummarize(form: FormData, deps: SummarizeDeps): Promise<Summary> {
  const startedAt = deps.now();
  try {
    const length = parseLength(form.get("length"));
    if (length === null) throw new AppError("BAD_REQUEST");

    const file = form.get("file");
    if (!isFileLike(file)) throw new AppError("BAD_REQUEST");

    // 크기는 바이트를 읽기 전에 file.size로 먼저 확인한다.
    const basics = checkFileBasics(file);
    if (basics) throw new AppError(basics);

    const data = new Uint8Array(await file.arrayBuffer());
    if (data.length < MAGIC.length || !MAGIC.every((b, i) => data[i] === b)) {
      throw new AppError("NOT_PDF");
    }

    const pages = await deps.countPages(data);
    if (pages > MAX_PAGES) throw new AppError("TOO_MANY_PAGES");

    const { text } = await deps.extractText(data);
    return await deps.summarize({ text, length, deadlineAt: startedAt + DEADLINE_MS,
      signal: deps.signal,
    });
  } catch (e) {
    throw toAppError(e);
  }
}
