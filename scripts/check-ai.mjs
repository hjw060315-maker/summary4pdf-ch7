// 실제 요약 점검: node --env-file=.env scripts/check-ai.mjs
// 키, 문서 텍스트, 응답 본문은 출력하지 않고 개수·소요 시간만 출력한다.
// 개인정보가 없는 예시 문서만 사용한다. TS 소스는 vite(ssr 로더)로 읽는다.
import { createServer } from "vite";

const server = await createServer({
  configFile: false,
  logLevel: "silent",
  appType: "custom",
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true },
});
let code = 0;
try {
  const { summarize } = await server.ssrLoadModule("/src/ai/index.ts");

  const BASE = [
    "광합성은 식물, 조류, 일부 세균이 빛 에너지를 화학 에너지로 바꾸는 과정이다. 엽록체 안의 엽록소가 빛을 흡수하고, 이 에너지로 물을 분해해 산소를 내보낸다.",
    "명반응에서는 빛 에너지가 ATP와 NADPH로 저장되고, 칼빈 회로에서는 이 에너지를 이용해 이산화탄소를 포도당으로 고정한다.",
    "빛의 세기, 이산화탄소 농도, 온도는 광합성 속도에 영향을 주는 대표적인 요인이다. 일정 수준을 넘으면 속도는 더 이상 증가하지 않는 한계 요인이 나타난다.",
    "광합성으로 만들어진 유기물은 식물의 생장에 쓰이고 먹이 사슬을 통해 다른 생물에게 전달된다. 또한 광합성은 대기 중 산소 농도를 유지하는 데 중요한 역할을 한다.",
  ].join("\n");

  const CASES = [
    { length: "short", text: BASE },
    { length: "normal", text: (BASE + "\n").repeat(3) },
    { length: "long", text: (BASE + "\n").repeat(8) },
  ];

  for (const { length, text } of CASES) {
    const start = Date.now();
    try {
      const r = await summarize({ text, length, deadlineAt: Date.now() + 55_000 });
      console.log(
        `length=${length} 입력=${text.length}자 oneLine=${r.oneLine.length}자 요점=${r.points.length}개 키워드=${r.keywords.length}개 truncated=${r.truncated} 시간=${Date.now() - start}ms`,
      );
    } catch (e) {
      console.log(`length=${length} 실패 종류=${e?.name ?? "unknown"} 시간=${Date.now() - start}ms`);
    }
  }
} catch {
  console.log("점검 실패: 모듈 로드 오류");
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
