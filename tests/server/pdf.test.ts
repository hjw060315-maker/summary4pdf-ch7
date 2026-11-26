import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { countPages, extractText } from "../../src/server/pdf";

const load = (name: string) =>
  new Uint8Array(readFileSync(join(__dirname, "..", "fixtures", name)));

async function codeOf(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return "NO_ERROR";
}

describe("countPages", () => {
  it("정상 PDF는 3쪽", async () => {
    expect(await countPages(load("normal-3p.pdf"))).toBe(3);
  });
  it("51쪽도 쪽수는 그대로 센다", async () => {
    expect(await countPages(load("pages-51.pdf"))).toBe(51);
  });
  it("텍스트 파일은 NOT_PDF", async () => {
    expect(await codeOf(countPages(load("fake.pdf")))).toBe("NOT_PDF");
  });
  it("암호 PDF는 UNREADABLE_PDF", async () => {
    expect(await codeOf(countPages(load("encrypted.pdf")))).toBe("UNREADABLE_PDF");
  });
  it("손상 PDF는 UNREADABLE_PDF", async () => {
    expect(await codeOf(countPages(load("corrupt.pdf")))).toBe("UNREADABLE_PDF");
  });
});

describe("extractText", () => {
  it("정상 PDF: 3쪽, 한글·영문 문장 포함", async () => {
    const r = await extractText(load("normal-3p.pdf"));
    expect(r.pageCount).toBe(3);
    expect(r.text).toContain("인공지능은 우리 생활을 바꾸고 있습니다");
    expect(r.text).toContain("Machine learning learns patterns from data");
  });
  it("51쪽은 TOO_MANY_PAGES", async () => {
    expect(await codeOf(extractText(load("pages-51.pdf")))).toBe("TOO_MANY_PAGES");
  });
  it("텍스트 없는 쪽만 있으면 NO_TEXT", async () => {
    expect(await codeOf(extractText(load("no-text.pdf")))).toBe("NO_TEXT");
  });
  it("0쪽은 EMPTY_PDF", async () => {
    expect(await codeOf(extractText(load("zero-pages.pdf")))).toBe("EMPTY_PDF");
  });
  it("암호·손상은 UNREADABLE_PDF", async () => {
    expect(await codeOf(extractText(load("encrypted.pdf")))).toBe("UNREADABLE_PDF");
    expect(await codeOf(extractText(load("corrupt.pdf")))).toBe("UNREADABLE_PDF");
  });
  it("텍스트 파일은 NOT_PDF", async () => {
    expect(await codeOf(extractText(load("fake.pdf")))).toBe("NOT_PDF");
  });
  it("50쪽 추출은 10초 안", async () => {
    const t0 = performance.now();
    const r = await extractText(load("pages-50.pdf"));
    const ms = performance.now() - t0;
    console.log(`[측정] 50쪽 추출 ${Math.round(ms)}ms`);
    expect(r.pageCount).toBe(50);
    expect(ms).toBeLessThan(10_000);
  });
});

describe("실패 로그", () => {
  afterEach(() => vi.restoreAllMocks());

  it("열기 실패는 오류 이름만 로그에 남기고 PDF 내용은 남기지 않는다", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await codeOf(countPages(load("corrupt.pdf")))).toBe("UNREADABLE_PDF");
    // pdf.js 자체 경고는 제외하고 우리 로그만 본다
    const ours = warn.mock.calls.filter((c) => String(c[0]).startsWith("[pdf]"));
    expect(ours).toHaveLength(1);
    const args = ours[0];
    expect(args[0]).toBe("[pdf] open failed:");
    expect(args).toHaveLength(2);
    expect(args[1]).toMatch(/^[A-Za-z]+$/);
    expect(args.join(" ")).not.toMatch(/corrupt|%PDF/);
  });
});
