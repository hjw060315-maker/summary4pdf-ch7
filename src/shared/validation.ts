import { MAX_FILE_BYTES } from "./constants";
import type { ErrorCode } from "./errors";
import type { SummaryLength } from "./types";

const LENGTHS: readonly SummaryLength[] = ["short", "normal", "long"];

export function parseLength(value: unknown): SummaryLength | null {
  return typeof value === "string" && (LENGTHS as readonly string[]).includes(value)
    ? (value as SummaryLength)
    : null;
}

/** 크기만 본다. PDF 형식·쪽수 검사는 서버 구역에서 한다. */
export function checkFileBasics(file: {
  size: number;
  type?: string;
  name?: string;
}): ErrorCode | null {
  return file.size > MAX_FILE_BYTES ? "FILE_TOO_LARGE" : null;
}
