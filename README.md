# PDF 요약

PDF 파일을 올리면 AI가 한 줄 요약, 요점, 키워드를 한국어로 정리해 주는 웹 앱입니다.
요약 길이(짧게, 보통, 길게)를 고를 수 있습니다.

## 요구 사항

- Node.js 20 이상

## 설치

```bash
npm install
```

## 환경 변수

`.env` 파일에 아래 변수를 설정합니다. `.env`는 깃에 올리지 않습니다.

- `OPENROUTER_API_KEY`: AI 요약에 쓰는 OpenRouter 키

`NEXT_PUBLIC_API_MODE`는 선택입니다. `mock`으로 두면 AI를 부르지 않고 정해 둔 모의 데이터를 보여 줍니다. 운영에서는 비워 두세요.

## 실행

```bash
npm run dev
```

## 테스트

```bash
npm test
```

## 제한

- 파일 크기: 4MB 이하
- 쪽수: 50쪽 이하

## 개인정보

서버에 파일이나 요약을 저장하지 않습니다. 다만 요약을 위해 문서의 글자가 외부 AI 서비스(OpenRouter)로 전송됩니다.

## 배포

Vercel에 배포합니다. 프로젝트 설정의 환경 변수에 `OPENROUTER_API_KEY`를 등록하세요.
