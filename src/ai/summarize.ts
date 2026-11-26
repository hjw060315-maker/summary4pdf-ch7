import { AiDeadlineError, AiUnavailableError } from "../shared/ai-contract";
import type { Summarize } from "../shared/ai-contract";
import { MODEL_TIMEOUT_MS } from "../shared/constants";
import { callModel, FALLBACK_MODEL, ModelCallError, PRIMARY_MODEL } from "./models";
import { parseSummary } from "./parse";
import { buildMessages, stripDelimiters } from "./prompt";
import { MAX_TEXT_CHARS, truncateText } from "./truncate";

export const summarize: Summarize = async ({ text, length, deadlineAt }) => {
  const cleaned = stripDelimiters(text);
  const { text: body, truncated } = truncateText(cleaned, MAX_TEXT_CHARS);
  const messages = buildMessages(body, length);

  // 마지막 실패가 마감 때문이었는지 기록
  let cutByDeadline = false;

  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    const remaining = deadlineAt - Date.now();
    if (remaining <= 0) throw new AiDeadlineError();
    const timeoutMs = Math.min(MODEL_TIMEOUT_MS, remaining);

    cutByDeadline = false;
    try {
      const raw = await callModel(model, messages, { timeoutMs });
      const parsed = parseSummary(raw, length, cleaned.length);
      if (parsed) return { ...parsed, truncated };
      console.warn(`[ai] model=${model} error=invalid-format`);
    } catch (e) {
      // callModel이 이미 모델명과 종류를 기록했다. 여기서는 종류만 판별한다.
      if (e instanceof ModelCallError && e.kind === "timeout") {
        cutByDeadline = timeoutMs < MODEL_TIMEOUT_MS || deadlineAt - Date.now() <= 0;
      } else if (!(e instanceof ModelCallError)) {
        console.warn(`[ai] model=${model} error=unexpected`);
      }
    }
  }

  if (cutByDeadline || deadlineAt - Date.now() <= 0) throw new AiDeadlineError();
  throw new AiUnavailableError();
};
