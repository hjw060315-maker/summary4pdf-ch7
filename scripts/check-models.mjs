// 모델 가용성 점검: node --env-file=.env scripts/check-models.mjs
// 키와 응답 본문은 출력하지 않고 응답 여부, 소요 시간, JSON 유효성만 출력한다.
const MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3.5-super-vl:free",
];
const TIMEOUT_MS = 25_000;
const SAMPLE =
  "광합성은 식물이 빛 에너지를 이용해 이산화탄소와 물로 포도당과 산소를 만드는 과정이다.";

async function check(model) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { model, answered: false, ms: 0, json: false, kind: "no-key" };
  const start = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: `다음 문장을 한 줄로 요약해 JSON {"summary": "..."} 형식으로만 답하세요.\n${SAMPLE}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = Date.now() - start;
    if (!res.ok) {
      return { model, answered: false, ms, json: false, kind: `HTTP ${Math.floor(res.status / 100)}xx (${res.status})` };
    }
    const data = await res.json().catch(() => null);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      return { model, answered: false, ms, json: false, kind: "empty" };
    }
    let json = false;
    try {
      const m = content.match(/\{[\s\S]*\}/);
      JSON.parse(m ? m[0] : content);
      json = true;
    } catch {
      json = false;
    }
    return { model, answered: true, ms, json, kind: "ok" };
  } catch (e) {
    const kind = e?.name === "TimeoutError" || e?.name === "AbortError" ? "timeout" : "network";
    return { model, answered: false, ms: Date.now() - start, json: false, kind };
  }
}

for (const model of MODELS) {
  const r = await check(model);
  console.log(
    `${r.model}: 응답=${r.answered ? "예" : "아니오"} 종류=${r.kind} 시간=${r.ms}ms JSON=${r.json ? "유효" : "무효"}`,
  );
}
