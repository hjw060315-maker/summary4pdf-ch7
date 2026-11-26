import { afterEach, describe, expect, it, vi } from "vitest";
import { summarizePdf } from "@/ui/api-client";
import { ERROR_MESSAGES } from "@/shared/errors";

const file = new File([new Uint8Array([1])], "a.pdf", { type: "application/pdf" });
const summary = { oneLine: "한 줄", points: ["a"], keywords: ["k"], truncated: false };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubFetch(res: Response | Error) {
  const fn = vi.fn(async () => {
    if (res instanceof Error) throw res;
    return res;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("summarizePdf", () => {
  it("성공하면 Summary를 돌려주고 file/length를 보낸다", async () => {
    const fn = stubFetch(Response.json(summary));
    await expect(summarizePdf(file, "long")).resolves.toEqual(summary);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/summarize");
    const body = init.body as FormData;
    expect(body.get("length")).toBe("long");
    expect(body.get("file")).toBeInstanceOf(File);
  });

  it("서버 오류의 code와 message를 그대로 쓴다", async () => {
    stubFetch(Response.json({ error: { code: "NO_TEXT", message: "글자 없음" } }, { status: 422 }));
    await expect(summarizePdf(file, "normal")).rejects.toMatchObject({ code: "NO_TEXT", message: "글자 없음" });
  });

  it("JSON이 아닌 413은 FILE_TOO_LARGE", async () => {
    stubFetch(new Response("Request Entity Too Large", { status: 413 }));
    await expect(summarizePdf(file, "normal")).rejects.toMatchObject({
      code: "FILE_TOO_LARGE",
      message: ERROR_MESSAGES.FILE_TOO_LARGE,
    });
  });

  it("네트워크 실패는 NETWORK", async () => {
    stubFetch(new TypeError("fetch failed"));
    await expect(summarizePdf(file, "normal")).rejects.toMatchObject({
      code: "NETWORK",
      message: "연결에 문제가 있어요. 잠시 후 다시 시도해 주세요",
    });
  });

  it("그 밖의 JSON 아닌 오류는 INTERNAL", async () => {
    stubFetch(new Response("<html>", { status: 502 }));
    await expect(summarizePdf(file, "normal")).rejects.toMatchObject({ code: "INTERNAL" });
  });

  it("mock 모드는 fetch 없이 모의 응답을 준다", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "mock");
    const fn = stubFetch(new Error("호출되면 안 됨"));
    const r = await summarizePdf(file, "short", { mockDelayMs: 0 });
    expect(r.points).toHaveLength(3);
    expect(fn).not.toHaveBeenCalled();
  });
});
