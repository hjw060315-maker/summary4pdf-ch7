import type { SummaryLength } from "./types";

export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_PAGES = 50;
export const POINTS_BY_LENGTH: Record<SummaryLength, number> = {
  short: 3,
  normal: 4,
  long: 5,
};
export const KEYWORDS_MIN = 5;
export const KEYWORDS_MAX = 10;
export const ROUTE_MAX_DURATION_S = 60;
export const DEADLINE_MS = 55_000;
export const MODEL_TIMEOUT_MS = 25_000;
