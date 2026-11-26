import { afterEach, describe, expect, it, vi } from "vitest";
import { runSummarize } from "@/server/summarize-service";
import { AppError } from "@/shared/errors";
import { AiDeadlineError, AiUnavailableError } from "@/shared/ai-contract";
import { MAX_FILE_BYTES } from "@/shared/constants";
import type { Summary } from "@/shared/types";

const SUMMARY: Summary = {
  oneLine: "한 줄",
  points: ["a", "b", "c"],
  keywords: ["k1", "k2", "k3", "k4", "k5"],
  truncated: false,
};
const START = 1_000_000;

function pdfBytes(size = 100): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(size);
  b.set([0x25, 0x50, 0x44, 0x46, 0x2d]);
  return b;
}

function makeForm(opts: { length?: string; file?: File | string | null } = {}): FormData {
  const form = new FormData();
  if (opts.length !== undefined) form.set("length", opts.length);
  if (opts.file === undefined) {
    form.set("file", new File([pdfBytes()], "a.pdf", { type: "application/pdf" }));
  } else if (opts.file !== null) {
    form.set("file", opts.file);
  }
  return form;
}

function makeDeps(over: Record<string, unknown> = {}) {
  return {
    countPages: vi.fn(async () => 3),
    extractText: vi.fn(async () => ({ text: "본문", pageCount: 3 })),
    summarize: vi.fn(async (input: { deadlineAt: number }) => {
      void input;
      return SUMMARY;
    }),
    now: vi.fn(() => START),
    ...over,
  } as unknown as Parameters<typeof runSummarize>[1] & {
    summarize: ReturnType<typeof vi.fn>;
    countPages: ReturnType<typeof vi.fn>;
    extractText: ReturnType<typeof vi.fn>;
  };
}

async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    return (e as AppError).code;
  }
  throw new Error("did not throw");
}

afterEach(() => vi.restoreAllMocks());

describe("runSummarize", () => {
  it("정상이면 Summary를 그대로 반환한다", async () => {
    const deps = makeDeps();
    expect(await runSummarize(makeForm({ length: "normal" }), deps)).toBe(SUMMARY);
    expect(deps.summarize.mock.calls[0][0]).toMatchObject({ text: "본문", length: "normal" });
  });

  it("length가 없거나 잘못되면 BAD_REQUEST", async () => {
    expect(await codeOf(runSummarize(makeForm(), makeDeps()))).toBe("BAD_REQUEST");
    expect(await codeOf(runSummarize(makeForm({ length: "huge" }), makeDeps()))).toBe("BAD_REQUEST");
  });

  it("파일이 없거나 문자열이면 BAD_REQUEST", async () => {
    expect(await codeOf(runSummarize(makeForm({ length: "short", file: null }), makeDeps()))).toBe("BAD_REQUEST");
    expect(await codeOf(runSummarize(makeForm({ length: "short", file: "x" }), makeDeps()))).toBe("BAD_REQUEST");
  });

  it("정확히 4MB는 통과, 4MB+1바이트는 FILE_TOO_LARGE", async () => {
    const ok = new File([pdfBytes(MAX_FILE_BYTES)], "a.pdf");
    expect(await runSummarize(makeForm({ length: "short", file: ok }), makeDeps())).toBe(SUMMARY);
    const big = new File([pdfBytes(MAX_FILE_BYTES + 1)], "a.pdf");
    const deps = makeDeps();
    expect(await codeOf(runSummarize(makeForm({ length: "short", file: big }), deps))).toBe("FILE_TOO_LARGE");
    expect(deps.countPages).not.toHaveBeenCalled();
  });

  it("PDF 머리말이 없으면 NOT_PDF", async () => {
    const f = new File([new Uint8Array([1, 2, 3, 4, 5, 6])], "a.pdf", { type: "application/pdf" });
    expect(await codeOf(runSummarize(makeForm({ length: "short", file: f }), makeDeps()))).toBe("NOT_PDF");
  });

  it("50쪽 초과면 TOO_MANY_PAGES", async () => {
    const deps = makeDeps({ countPages: vi.fn(async () => 51) });
    expect(await codeOf(runSummarize(makeForm({ length: "short" }), deps))).toBe("TOO_MANY_PAGES");
    expect(deps.extractText).not.toHaveBeenCalled();
  });

  it("특수한 파일명도 정상이고 반환값과 console에 파일 이름이 없다", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const f = new File([pdfBytes()], "논문 최종본 (1)#.pdf", { type: "application/pdf" });
    const result = await runSummarize(makeForm({ length: "short", file: f }), makeDeps());
    expect(JSON.stringify(result)).not.toContain("논문");
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });

  it("AiUnavailableError는 AI_BUSY, AiDeadlineError는 TIMEOUT", async () => {
    const a = makeDeps({
      summarize: vi.fn(async () => {
        throw new AiUnavailableError();
      }),
    });
    expect(await codeOf(runSummarize(makeForm({ length: "short" }), a))).toBe("AI_BUSY");
    const b = makeDeps({
      summarize: vi.fn(async () => {
        throw new AiDeadlineError();
      }),
    });
    expect(await codeOf(runSummarize(makeForm({ length: "short" }), b))).toBe("TIMEOUT");
  });

  it("알 수 없는 오류는 INTERNAL이며 본문이 새지 않고 로그에는 이름만 남는다", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const deps = makeDeps({
      summarize: vi.fn(async () => {
        throw new TypeError("비밀 본문 SECRET");
      }),
    });
    let thrown: unknown;
    try {
      await runSummarize(makeForm({ length: "short" }), deps);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).code).toBe("INTERNAL");
    expect((thrown as AppError).message).not.toContain("SECRET");
    const logged = JSON.stringify(err.mock.calls);
    expect(logged).toContain("TypeError");
    expect(logged).not.toContain("SECRET");
  });

  it("추출이 던진 AppError는 그 코드 그대로", async () => {
    const deps = makeDeps({
      extractText: vi.fn(async () => {
        throw new AppError("NO_TEXT");
      }),
    });
    expect(await codeOf(runSummarize(makeForm({ length: "short" }), deps))).toBe("NO_TEXT");
  });

  it("요약 함수에 deadlineAt = 시작 + 55_000이 전달된다", async () => {
    const deps = makeDeps({
      now: vi.fn().mockReturnValueOnce(START).mockReturnValue(START + 9999),
    });
    await runSummarize(makeForm({ length: "short" }), deps);
    expect(deps.summarize.mock.calls[0][0].deadlineAt).toBe(START + 55_000);
  });
});
