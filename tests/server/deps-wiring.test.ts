import { describe, expect, it } from "vitest";
import * as deps from "@/server/summarize-deps";
import * as ai from "@/ai";
import * as pdf from "@/server/pdf";

describe("summarize-deps 연결", () => {
  it("summarize는 src/ai의 실제 함수다", () => {
    expect(deps.summarize).toBe(ai.summarize);
  });
  it("countPages와 extractText는 pdf 모듈의 함수다", () => {
    expect(deps.countPages).toBe(pdf.countPages);
    expect(deps.extractText).toBe(pdf.extractText);
  });
});
