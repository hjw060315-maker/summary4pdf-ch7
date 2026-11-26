import { AiUnavailableError } from "@/shared/ai-contract";
import type { Summarize } from "@/shared/ai-contract";

export { countPages, extractText } from "./pdf";

// 임시 자리표시자: 이후 작업에서 실제 src/ai의 summarize로 교체한다.
export const summarize: Summarize = async () => {
  throw new AiUnavailableError();
};
