import type { Summary, SummaryLength } from "./types";

export interface SummarizeInput {
  text: string;
  length: SummaryLength;
  /** 전체 마감 시각(Date.now() 기준 epoch ms) */
  deadlineAt: number;
}

/** AI 구역이 구현하고 라우트가 호출하는 약속 */
export type Summarize = (input: SummarizeInput) => Promise<Summary>;

/** 두 모델이 모두 실패했을 때 */
export class AiUnavailableError extends Error {
  constructor(message = "AI models unavailable") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

/** 전체 마감 시간을 넘겼을 때 */
export class AiDeadlineError extends Error {
  constructor(message = "AI deadline exceeded") {
    super(message);
    this.name = "AiDeadlineError";
  }
}
