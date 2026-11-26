import { describe, expect, it } from "vitest";
import { validateFile } from "@/ui/validate-file";
import { MAX_FILE_BYTES } from "@/shared/constants";

const pdf = (size: number) => ({ size, type: "application/pdf", name: "a.pdf" });

describe("validateFile", () => {
  it("정확히 4MB는 통과", () => expect(validateFile(pdf(MAX_FILE_BYTES))).toBeNull());
  it("4MB + 1바이트는 FILE_TOO_LARGE", () =>
    expect(validateFile(pdf(MAX_FILE_BYTES + 1))).toBe("FILE_TOO_LARGE"));
  it("확장자도 형식도 PDF가 아니면 NOT_PDF", () =>
    expect(validateFile({ size: 10, type: "image/png", name: "a.png" })).toBe("NOT_PDF"));
  it("형식이 비어 있어도 .pdf 확장자면 통과", () =>
    expect(validateFile({ size: 10, type: "", name: "A.PDF" })).toBeNull());
  it("형식이 PDF면 확장자가 달라도 통과", () =>
    expect(validateFile({ size: 10, type: "application/pdf", name: "doc" })).toBeNull());
});
