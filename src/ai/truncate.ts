/** 모델에 보내는 문서 텍스트의 최대 글자 수(UTF-16 코드 단위) */
export const MAX_TEXT_CHARS = 30_000;

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

/** 한도를 넘으면 잘라내되, 서로게이트 쌍의 중간에서 자르지 않는다. */
export function truncateText(text: string, limit: number): { text: string; truncated: boolean } {
  if (text.length <= limit) return { text, truncated: false };
  let cut = Math.max(0, limit);
  // 잘린 끝이 서로게이트 쌍의 앞 절반이면 그 절반도 버린다.
  if (cut > 0 && isHighSurrogate(text.charCodeAt(cut - 1))) cut -= 1;
  return { text: text.slice(0, cut), truncated: true };
}
