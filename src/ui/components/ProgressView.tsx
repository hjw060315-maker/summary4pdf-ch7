export function ProgressView() {
  return (
    <div className="progress" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>요약하는 중이에요. 최대 1분쯤 걸릴 수 있어요</p>
    </div>
  );
}
