import { POINTS_BY_LENGTH } from "@/shared/constants";
import type { Summary, SummaryLength } from "@/shared/types";

const POINTS = [
  "올해 사업은 세 단계로 나누어 차례대로 진행합니다.",
  "첫 단계에서는 현재 상황을 조사하고 문제를 정리합니다.",
  "둘째 단계에서는 해결 방법을 정하고 시험 운영을 합니다.",
  "마지막 단계에서는 결과를 평가해 다음 계획에 반영합니다.",
  "모든 과정은 담당 부서가 매달 점검하고 공개합니다.",
];

/** 서버 없이 화면을 확인하기 위한 모의 요약 */
export function mockSummary(length: SummaryLength): Summary {
  return {
    oneLine: "이 문서는 올해 사업의 추진 단계와 점검 방법을 설명하는 계획서입니다.",
    points: POINTS.slice(0, POINTS_BY_LENGTH[length]),
    keywords: ["사업 계획", "추진 단계", "현황 조사", "시험 운영", "평가", "점검"],
    truncated: length === "long",
  };
}
