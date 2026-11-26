import { z } from "zod";
import { KEYWORDS_MAX, KEYWORDS_MIN, POINTS_BY_LENGTH } from "../shared/constants";
import type { Summary, SummaryLength } from "../shared/types";

export const SHORT_TEXT_CHARS = 300;

const text = z.string().refine((s) => s.trim().length > 0);

const schema = z.object({
  oneLine: text,
  points: z.array(text),
  keywords: z.array(text),
});

function extractJson(raw: string): unknown {
  const candidates: string[] = [raw.trim()];
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1].trim());
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(raw.slice(first, last + 1));
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      // 다음 후보
    }
  }
  return undefined;
}

/** 형식이나 개수가 틀리면 null. truncated는 호출한 쪽에서 채운다(여기서는 false). */
export function parseSummary(raw: string, length: SummaryLength, textLength: number): Summary | null {
  const parsed = schema.safeParse(extractJson(raw));
  if (!parsed.success) return null;
  const n = POINTS_BY_LENGTH[length];
  const count = parsed.data.points.length;
  const short = textLength < SHORT_TEXT_CHARS;
  const kw = parsed.data.keywords.length;
  const keywordsOk = short ? kw >= 1 && kw <= KEYWORDS_MAX : kw >= KEYWORDS_MIN && kw <= KEYWORDS_MAX;
  const ok = keywordsOk && (short ? count >= 1 && count <= n : count === n);
  if (!ok) return null;
  return {
    oneLine: parsed.data.oneLine.trim(),
    points: parsed.data.points.map((s) => s.trim()),
    keywords: parsed.data.keywords.map((s) => s.trim()),
    truncated: false,
  };
}
