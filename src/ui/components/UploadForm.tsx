"use client";

import { useState, type DragEvent } from "react";
import { ERROR_MESSAGES } from "@/shared/errors";
import type { Summary, SummaryLength } from "@/shared/types";
import { ApiClientError, NETWORK_MESSAGE, summarizePdf } from "../api-client";
import { validateFile } from "../validate-file";
import { ErrorNotice } from "./ErrorNotice";
import { PrivacyNotice } from "./PrivacyNotice";
import { ProgressView } from "./ProgressView";
import { SummaryResult } from "./SummaryResult";

const LENGTHS: { value: SummaryLength; label: string }[] = [
  { value: "short", label: "짧게" },
  { value: "normal", label: "보통" },
  { value: "long", label: "자세히" },
];

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [length, setLength] = useState<SummaryLength>("normal");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  function pick(f: File | undefined) {
    if (!f || loading) return;
    setSummary(null);
    const code = validateFile(f);
    if (code) {
      setFile(null);
      setError(ERROR_MESSAGES[code]);
      return;
    }
    setError(null);
    setFile(f);
  }

  function onDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setDragging(false);
    if (loading) return;
    pick(e.dataTransfer.files[0]);
  }

  async function submit() {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      setSummary(await summarizePdf(file, length));
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : NETWORK_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form">
      <PrivacyNotice />

      <div
        className={`dropzone${dragging ? " is-dragging" : ""}${loading ? " is-disabled" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!loading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          id="pdf-file"
          className="file-input"
          type="file"
          accept="application/pdf,.pdf"
          disabled={loading}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <label htmlFor="pdf-file" className="dropzone-label">
          <strong>{file ? "다른 PDF 고르기" : "PDF 파일 고르기"}</strong>
          <span>또는 여기에 파일을 끌어 놓으세요 (최대 4MB, 50쪽)</span>
        </label>
        <p className="chosen">{file ? `선택한 파일: ${file.name}` : "아직 고른 파일이 없어요"}</p>
      </div>

      <fieldset className="lengths" disabled={loading}>
        <legend>요약 길이</legend>
        <div className="length-options">
          {LENGTHS.map((l) => (
            <label key={l.value} className="length-option">
              <input
                type="radio"
                name="length"
                value={l.value}
                checked={length === l.value}
                onChange={() => setLength(l.value)}
              />
              <span>{l.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="button" className="primary" onClick={submit} disabled={!file || loading}>
        {loading ? "요약하는 중…" : "요약하기"}
      </button>
      {!file && !loading && <p className="hint">PDF 파일을 고르면 요약하기 버튼이 켜져요.</p>}

      <div aria-live="polite">
        {loading && <ProgressView />}
        {error && <ErrorNotice message={error} />}
        {summary && <SummaryResult summary={summary} />}
      </div>
    </div>
  );
}
