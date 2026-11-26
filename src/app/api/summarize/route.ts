import { runSummarize } from "@/server/summarize-service";
import { countPages, extractText, summarize } from "@/server/summarize-deps";
import { AppError, ERROR_HTTP_STATUS, ERROR_MESSAGES } from "@/shared/errors";
import type { ErrorCode } from "@/shared/errors";

export const maxDuration = 60;

function errorResponse(code: ErrorCode): Response {
  return Response.json(
    { error: { code, message: ERROR_MESSAGES[code] } },
    { status: ERROR_HTTP_STATUS[code] },
  );
}

export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("BAD_REQUEST");
  }

  try {
    const summary = await runSummarize(form, {
      countPages,
      extractText,
      summarize,
      now: () => Date.now(),
      signal: request.signal,
    });
    return Response.json(summary, { status: 200 });
  } catch (e) {
    if (e instanceof AppError) return errorResponse(e.code);
    console.error("route failed:", e instanceof Error ? e.name : "UnknownError");
    return errorResponse("INTERNAL");
  }
}
