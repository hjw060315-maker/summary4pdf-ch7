export type ErrorCode =
  | "NOT_PDF"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_PAGES"
  | "UNREADABLE_PDF"
  | "NO_TEXT"
  | "EMPTY_PDF"
  | "AI_BUSY"
  | "TIMEOUT"
  | "BAD_REQUEST"
  | "INTERNAL";

export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  NOT_PDF: 400,
  FILE_TOO_LARGE: 413,
  TOO_MANY_PAGES: 400,
  UNREADABLE_PDF: 422,
  NO_TEXT: 422,
  EMPTY_PDF: 422,
  AI_BUSY: 503,
  TIMEOUT: 504,
  BAD_REQUEST: 400,
  INTERNAL: 500,
};

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  NOT_PDF: "PDF 파일만 올릴 수 있어요",
  FILE_TOO_LARGE: "파일이 너무 큽니다(최대 4MB, 50쪽)",
  TOO_MANY_PAGES: "파일이 너무 큽니다(최대 4MB, 50쪽)",
  UNREADABLE_PDF: "파일을 열 수 없습니다",
  NO_TEXT: "텍스트를 읽을 수 없는 PDF입니다. 텍스트가 포함된 PDF를 올려 주세요",
  EMPTY_PDF: "내용이 없는 PDF입니다",
  AI_BUSY: "지금 요약 서비스가 혼잡합니다. 잠시 후 다시 시도해 주세요",
  TIMEOUT: "요약이 오래 걸려 중단했습니다. 잠시 후 다시 시도해 주세요",
  BAD_REQUEST: "요청이 올바르지 않아요",
  INTERNAL: "요약하지 못했어요. 잠시 후 다시 시도해 주세요.",
};

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
  }
}
