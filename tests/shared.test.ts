import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES } from "@/shared/constants";
import { AppError, ERROR_HTTP_STATUS, ERROR_MESSAGES, type ErrorCode } from "@/shared/errors";
import { checkFileBasics, parseLength } from "@/shared/validation";

const ALL_CODES: ErrorCode[] = [
  "NOT_PDF",
  "FILE_TOO_LARGE",
  "TOO_MANY_PAGES",
  "UNREADABLE_PDF",
  "NO_TEXT",
  "EMPTY_PDF",
  "AI_BUSY",
  "TIMEOUT",
  "BAD_REQUEST",
  "INTERNAL",
];

describe("parseLength", () => {
  it("허용된 값은 그대로 돌려준다", () => {
    expect(parseLength("short")).toBe("short");
    expect(parseLength("normal")).toBe("normal");
    expect(parseLength("long")).toBe("long");
  });
  it("그 밖의 값은 null", () => {
    expect(parseLength("x")).toBeNull();
    expect(parseLength(undefined)).toBeNull();
  });
});

describe("checkFileBasics", () => {
  it("4MB 이하는 통과", () => {
    expect(checkFileBasics({ size: 4 * 1024 * 1024 })).toBeNull();
    expect(MAX_FILE_BYTES).toBe(4 * 1024 * 1024);
  });
  it("4MB 초과는 FILE_TOO_LARGE", () => {
    expect(checkFileBasics({ size: 4 * 1024 * 1024 + 1 })).toBe("FILE_TOO_LARGE");
  });
});

describe("오류 코드", () => {
  it("FILE_TOO_LARGE 문구", () => {
    expect(ERROR_MESSAGES.FILE_TOO_LARGE).toContain("파일이 너무 큽니다(최대 4MB, 50쪽)");
  });
  it("모든 코드에 문구와 HTTP 상태가 있다", () => {
    for (const code of ALL_CODES) {
      expect(ERROR_MESSAGES[code]).toBeTruthy();
      expect(ERROR_HTTP_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
  });
  it("HTTP 상태 값", () => {
    expect(ERROR_HTTP_STATUS.FILE_TOO_LARGE).toBe(413);
    expect(ERROR_HTTP_STATUS.AI_BUSY).toBe(503);
    expect(ERROR_HTTP_STATUS.TIMEOUT).toBe(504);
    expect(ERROR_HTTP_STATUS.INTERNAL).toBe(500);
  });
  it("AppError는 code를 가진다", () => {
    const e = new AppError("NO_TEXT");
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("NO_TEXT");
  });
});
