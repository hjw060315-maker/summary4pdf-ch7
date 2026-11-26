# API 약속

> 이 문서와 `src/shared/**`는 backend-developer가 관리한다. 바꾸려면 backend-developer, ai-integration-specialist, frontend-developer 세 담당이 합의해야 한다.

기준: `docs/superpowers/specs/2026-11-26-pdf-summary-design.md` 7장.

## POST /api/summarize

`multipart/form-data`

- `file`: PDF 1개 (필수)
- `length`: `short` | `normal` | `long` (필수, 기본 `normal`)

### 성공 응답 `200`

```json
{
  "oneLine": "문서 전체를 한 문장으로",
  "points": ["핵심 요점 …"],
  "keywords": ["키워드", "…"],
  "truncated": false
}
```

- `points`: 짧게 3개, 보통 4개, 자세히 5개(문장 길이도 차이). `keywords`: 5~10개.
- `truncated`: 텍스트가 길어 앞부분만 사용했으면 `true`(화면에 "문서가 길어 앞부분을 기준으로 요약했어요" 표시).

### 오류 응답

```json
{ "error": { "code": "FILE_TOO_LARGE", "message": "파일이 너무 큽니다(최대 4MB, 50쪽)" } }
```

| code | HTTP | 상황 | 안내 |
|---|---|---|---|
| `NOT_PDF` | 400 | PDF가 아님 | PDF 파일만 올릴 수 있어요 |
| `FILE_TOO_LARGE` | 413 | 4MB 초과 | 파일이 너무 큽니다(최대 4MB, 50쪽) |
| `TOO_MANY_PAGES` | 400 | 50쪽 초과 | 파일이 너무 큽니다(최대 4MB, 50쪽) |
| `UNREADABLE_PDF` | 422 | 암호·손상 | 파일을 열 수 없습니다 |
| `NO_TEXT` | 422 | 쪽은 있는데 텍스트 없음(스캔 등) | 텍스트를 읽을 수 없는 PDF입니다. 텍스트가 포함된 PDF를 올려 주세요 |
| `EMPTY_PDF` | 422 | 0쪽·내용 없음 | 내용이 없는 PDF입니다 |
| `AI_BUSY` | 503 | 두 모델 모두 실패(한도·장애·형식 오류) | 지금 요약 서비스가 혼잡합니다. 잠시 후 다시 시도해 주세요 |
| `TIMEOUT` | 504 | 시간 초과 | 요약이 오래 걸려 중단했습니다. 잠시 후 다시 시도해 주세요 |
| `BAD_REQUEST` | 400 | `length` 값 오류, 파일 없음 | 요청이 올바르지 않아요 |
| `INTERNAL` | 500 | 예상하지 못한 서버 오류 (설계에 없던 코드, 이 문서에서 추가) | 요약하지 못했어요. 잠시 후 다시 시도해 주세요. |

### 참고

- 쪽수 50 초과는 거절(`TOO_MANY_PAGES`)한다. `truncated`는 추출한 텍스트가 모델 입력 길이를 넘을 때만 쓴다.
- `EMPTY_PDF`는 0쪽이거나 구조상 내용이 없을 때만, 쪽은 있으나 텍스트가 없으면 `NO_TEXT`.
- 플랫폼 413(본문 4.5MB 초과) 응답은 JSON이 아닐 수 있다. 화면은 업로드 전에 4MB를 먼저 검사하고, 413이 오면 `FILE_TOO_LARGE`와 같이 안내한다.
- 서버는 파일·텍스트·요약을 저장하거나 로그에 남기지 않는다.

## 공통 약속 위치 (`src/shared/`)

| 파일 | 내용 |
|---|---|
| `types.ts` | `SummaryLength`, `Summary` |
| `constants.ts` | `MAX_FILE_BYTES`(4MB), `MAX_PAGES`(50), `POINTS_BY_LENGTH`, `KEYWORDS_MIN/MAX`, `ROUTE_MAX_DURATION_S`(60), `DEADLINE_MS`(55000), `MODEL_TIMEOUT_MS`(25000) |
| `errors.ts` | `ErrorCode`, `ERROR_HTTP_STATUS`, `ERROR_MESSAGES`, `AppError` |
| `ai-contract.ts` | `summarize({ text, length, deadlineAt }): Promise<Summary>` 약속, `AiUnavailableError`(두 모델 실패 -> `AI_BUSY`), `AiDeadlineError`(마감 초과 -> `TIMEOUT`) |
| `validation.ts` | `parseLength`, `checkFileBasics`(크기만 검사) |

참고: `ERROR_HTTP_STATUS`와 `ERROR_MESSAGES`는 `errors.ts`에 있다(`constants.ts`가 아님).

- PDF 라이브러리: `unpdf`(pdf.js 서버리스 번들) 선택. 네이티브 의존성이 없어 Vercel Node에서 돌고, 암호(PasswordException)·손상을 열기 단계에서 예외로 구분할 수 있어 `UNREADABLE_PDF`로 처리한다.
