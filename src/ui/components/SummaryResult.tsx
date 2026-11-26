import type { Summary } from "@/shared/types";

export function SummaryResult({ summary }: { summary: Summary }) {
  return (
    <section className="result" aria-live="polite" aria-labelledby="result-title" tabIndex={-1} id="result">
      <h2 id="result-title" className="sr-only">요약 결과</h2>
      {summary.truncated && (
        <p className="notice notice-warn">문서가 길어 앞부분을 기준으로 요약했어요</p>
      )}
      <div className="card">
        <h3>한 줄 요약</h3>
        <p className="one-line">{summary.oneLine}</p>
      </div>
      <div className="card">
        <h3>핵심 요점</h3>
        <ul>
          {summary.points.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h3>주요 키워드</h3>
        <ul className="keywords">
          {summary.keywords.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ul>
      </div>
      <p className="notice">AI 요약은 부정확할 수 있으니 중요한 내용은 원문을 확인하세요</p>
    </section>
  );
}
