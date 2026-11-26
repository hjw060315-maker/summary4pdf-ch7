import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/shared/errors";
import { AiUnavailableError } from "@/shared/ai-contract";

const state = vi.hoisted(() => ({ mode: "ok" as "ok" | "app" | "ai" | "boom" }));

vi.mock("@/server/summarize-deps", () => ({
  countPages: async () => 1,
  extractText: async () => ({ text: "t", pageCount: 1 }),
  summarize: async () => {
    if (state.mode === "app") throw new AppError("NO_TEXT");
    if (state.mode === "ai") throw new AiUnavailableError();
    if (state.mode === "boom") throw new Error("SECRET");
    return { oneLine: "x", points: ["a", "b", "c"], keywords: ["1", "2", "3", "4", "5"], truncated: false };
  },
}));

import { POST, maxDuration } from "@/app/api/summarize/route";

function req(length?: string): Request {
  const form = new FormData();
  if (length) form.set("length", length);
  form.set("file", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 1])], "a.pdf"));
  return new Request("http://localhost/api/summarize", { method: "POST", body: form });
}

describe("POST /api/summarize", () => {
  it("maxDuration은 60", () => expect(maxDuration).toBe(60));

  it("성공이면 200과 Summary", async () => {
    state.mode = "ok";
    const res = await POST(req("short"));
    expect(res.status).toBe(200);
    expect((await res.json()).oneLine).toBe("x");
  });

  it("실패는 상태 코드와 { error: { code, message } }", async () => {
    state.mode = "ok";
    const bad = await POST(req());
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: { code: "BAD_REQUEST", message: "요청이 올바르지 않아요" } });

    state.mode = "app";
    expect((await POST(req("short"))).status).toBe(422);
    state.mode = "ai";
    expect((await POST(req("short"))).status).toBe(503);
  });

  it("알 수 없는 오류는 500 INTERNAL이고 본문이 없다", async () => {
    state.mode = "boom";
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(req("short"));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("SECRET");
    expect(JSON.parse(text).error.code).toBe("INTERNAL");
  });

  it("form이 아닌 요청은 400 BAD_REQUEST", async () => {
    const res = await POST(new Request("http://localhost/api/summarize", { method: "POST", body: "x" }));
    expect(res.status).toBe(400);
  });
});
