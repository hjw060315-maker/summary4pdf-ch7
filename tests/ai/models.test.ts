import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  callModel,
  FALLBACK_MODEL,
  ModelCallError,
  PRIMARY_MODEL,
} from "../../src/ai/models";

const FAKE_KEY = "test-key-should-never-be-logged";
const SECRET_BODY = "비밀-응답-본문-SECRET";
const MESSAGES = [{ role: "user" as const, content: "비밀-프롬프트-PROMPT" }];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("callModel", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", FAKE_KEY);
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("모델 이름이 약속과 같다", () => {
    expect(PRIMARY_MODEL).toBe("nvidia/nemotron-3-ultra-550b-a55b:free");
    expect(FALLBACK_MODEL).toBe("nvidia/nemotron-3.5-super-vl:free");
  });

  it("200 정상 응답이면 content 문자열을 돌려준다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ choices: [{ message: { content: "안녕" } }] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(callModel(PRIMARY_MODEL, MESSAGES, { timeoutMs: 1000 })).resolves.toBe("안녕");
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body).model).toBe(PRIMARY_MODEL);
    expect(init.headers.Authorization).toBe(`Bearer ${FAKE_KEY}`);
  });

  it("429면 ModelCallError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: SECRET_BODY }, 429)));
    await expect(callModel(PRIMARY_MODEL, MESSAGES, { timeoutMs: 1000 })).rejects.toBeInstanceOf(
      ModelCallError,
    );
  });

  it("content가 null이면 ModelCallError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ choices: [{ message: { content: null } }] })),
    );
    await expect(callModel(PRIMARY_MODEL, MESSAGES, { timeoutMs: 1000 })).rejects.toBeInstanceOf(
      ModelCallError,
    );
  });

  it("timeoutMs를 넘으면 ModelCallError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_res, rej) => {
          init.signal?.addEventListener("abort", () =>
            rej(new DOMException("aborted", "AbortError")),
          );
        }),
      ),
    );
    await expect(callModel(PRIMARY_MODEL, MESSAGES, { timeoutMs: 20 })).rejects.toBeInstanceOf(
      ModelCallError,
    );
  });

  it("바깥 signal이 취소되면 ModelCallError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_res, rej) => {
          init.signal?.addEventListener("abort", () =>
            rej(new DOMException("aborted", "AbortError")),
          );
        }),
      ),
    );
    const ctl = new AbortController();
    const p = callModel(PRIMARY_MODEL, MESSAGES, { timeoutMs: 5000, signal: ctl.signal });
    ctl.abort();
    await expect(p).rejects.toBeInstanceOf(ModelCallError);
  });

  it("키가 없으면 ModelCallError", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn());
    await expect(callModel(PRIMARY_MODEL, MESSAGES, { timeoutMs: 1000 })).rejects.toBeInstanceOf(
      ModelCallError,
    );
  });

  it("로그에 키, 프롬프트, 응답 본문이 없고 모델명과 오류 종류만 남는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: SECRET_BODY }, 429)));
    await callModel(FALLBACK_MODEL, MESSAGES, { timeoutMs: 1000 }).catch(() => {});
    expect(warn).toHaveBeenCalled();
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain(FAKE_KEY);
    expect(logged).not.toContain(SECRET_BODY);
    expect(logged).not.toContain("PROMPT");
    expect(logged).toContain(FALLBACK_MODEL);
    expect(logged).toContain("http-429");
  });
});
