import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SummaryResult } from "@/ui/components/SummaryResult";
import { PrivacyNotice } from "@/ui/components/PrivacyNotice";
import { ErrorNotice } from "@/ui/components/ErrorNotice";
import { ProgressView } from "@/ui/components/ProgressView";

const base = { oneLine: "이 문서는 예산안이다", points: ["요점 하나", "요점 둘"], keywords: ["예산", "정책"], truncated: false };
const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("SummaryResult", () => {
  it("세 부분과 정확도 안내를 보여 준다", () => {
    const html = render(createElement(SummaryResult, { summary: base }));
    for (const t of ["한 줄 요약", "핵심 요점", "주요 키워드", "이 문서는 예산안이다", "요점 하나", "요점 둘", "예산", "정책"])
      expect(html).toContain(t);
    expect(html).toContain("AI 요약은 부정확할 수 있으니 중요한 내용은 원문을 확인하세요");
    expect(html).toContain("<li");
  });
  it("truncated일 때만 앞부분 안내", () => {
    const msg = "문서가 길어 앞부분을 기준으로 요약했어요";
    expect(render(createElement(SummaryResult, { summary: base }))).not.toContain(msg);
    expect(render(createElement(SummaryResult, { summary: { ...base, truncated: true } }))).toContain(msg);
  });
  it("파일 이름·쪽수·글자 수를 보이지 않는다", () => {
    const html = render(createElement(SummaryResult, { summary: base }));
    expect(html).not.toMatch(/\.pdf|쪽|페이지|글자|자수/);
  });
});

describe("PrivacyNotice", () => {
  it("외부 전달 안내를 항상 보여 준다", () => {
    expect(render(createElement(PrivacyNotice))).toContain(
      "문서 내용이 외부 AI 서비스로 전달됩니다. 민감한 개인정보나 비공개 자료는 올리지 마세요.",
    );
  });
});

describe("ProgressView / ErrorNotice", () => {
  it("진행 문구와 aria-live", () => {
    const html = render(createElement(ProgressView));
    expect(html).toContain("요약하는 중이에요. 최대 1분쯤 걸릴 수 있어요");
    expect(html).toContain("aria-live");
  });
  it("오류는 메시지와 role=alert", () => {
    const html = render(createElement(ErrorNotice, { message: "PDF 파일만 올릴 수 있어요" }));
    expect(html).toContain("PDF 파일만 올릴 수 있어요");
    expect(html).toContain('role="alert"');
  });
});
