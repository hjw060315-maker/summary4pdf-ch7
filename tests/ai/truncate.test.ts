import { describe, expect, it } from "vitest";
import { truncateText } from "../../src/ai/truncate";

function hasBroken(s: string): boolean {
  if (s.includes("�")) return true;
  // 외톨이 서로게이트 검사
  return /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);
}

describe("truncateText", () => {
  it("한도 이하면 그대로 두고 truncated=false", () => {
    expect(truncateText("안녕", 10)).toEqual({ text: "안녕", truncated: false });
    expect(truncateText("가".repeat(10), 10)).toEqual({ text: "가".repeat(10), truncated: false });
  });

  it("한도를 넘으면 truncated=true이고 결과가 한도 이하", () => {
    const r = truncateText("가".repeat(25), 10);
    expect(r.truncated).toBe(true);
    expect(r.text.length).toBeLessThanOrEqual(10);
    expect(r.text).toBe("가".repeat(10));
  });

  it("이모지 경계에서 잘라도 깨진 문자가 없다", () => {
    for (let limit = 1; limit <= 9; limit++) {
      const r = truncateText("😀".repeat(20), limit);
      expect(r.truncated).toBe(true);
      expect(r.text.length).toBeLessThanOrEqual(limit);
      expect(hasBroken(r.text)).toBe(false);
      expect(r.text).toBe("😀".repeat(Math.floor(limit / 2)));
    }
  });

  it("글자 중간(혼합 문자)에서 잘라도 깨지지 않는다", () => {
    const text = "a😀b😀c😀".repeat(10);
    for (let limit = 1; limit < text.length; limit++) {
      const r = truncateText(text, limit);
      expect(r.text.length).toBeLessThanOrEqual(limit);
      expect(hasBroken(r.text)).toBe(false);
    }
  });
});
