import { MAX_FILE_BYTES } from "@/shared/constants";
import type { ErrorCode } from "@/shared/errors";

/** 올리기 전에 먼저 보는 검사. 서버 검증과는 별개다. */
export function validateFile(file: { size: number; type: string; name: string }): ErrorCode | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "NOT_PDF";
  if (file.size > MAX_FILE_BYTES) return "FILE_TOO_LARGE";
  return null;
}
