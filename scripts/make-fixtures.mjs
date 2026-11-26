// 시험용 PDF 생성: node scripts/make-fixtures.mjs [한글 TTF 경로]
// 한글 글꼴은 인자 또는 FIXTURE_FONT 환경 변수, 없으면 Windows 맑은 고딕을 쓴다.
// 생성물은 tests/fixtures에 커밋되어 있어 평소에는 다시 만들 필요가 없다.
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "tests", "fixtures");
mkdirSync(out, { recursive: true });
const fontPath = process.argv[2] ?? process.env.FIXTURE_FONT ?? "C:/Windows/Fonts/malgun.ttf";
const fontBytes = readFileSync(fontPath);
const save = (name, bytes) => writeFileSync(join(out, name), bytes);

async function textPdf(pages, lineFor) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  for (let i = 0; i < pages; i++) {
    doc.addPage().drawText(lineFor(i), { x: 50, y: 700, size: 14, font });
  }
  return doc.save();
}

// 정상: 한글·영문 3쪽
const lines = [
  "첫째 쪽: 인공지능은 우리 생활을 바꾸고 있습니다.",
  "Second page: Machine learning learns patterns from data.",
  "셋째 쪽: 요약 서비스는 긴 문서를 짧게 줄여 줍니다.",
];
save("normal-3p.pdf", await textPdf(3, (i) => lines[i]));
// 51쪽
save("pages-51.pdf", await textPdf(51, (i) => `Page ${i + 1} sample text`));
// 50쪽(속도 측정용): 쪽마다 문단 하나
save("pages-50.pdf", await textPdf(50, (i) => `페이지 ${i + 1}: 시간 측정용 문장입니다. Timing sample sentence number ${i + 1}.`));

// 텍스트 없는 쪽만
{
  const doc = await PDFDocument.create();
  doc.addPage(); doc.addPage();
  save("no-text.pdf", await doc.save());
}
// 0쪽: pdf-lib로 만든 빈 문서는 pdf.js가 1쪽으로 읽으므로 /Kids [] 를 직접 쓴다.
function plainPdf(objs, trailerExtra = "") {
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R${trailerExtra} >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}
save("zero-pages.pdf", plainPdf(["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [] /Count 0 >>"]));
// 손상: 정상 파일의 앞부분만
{
  const full = await textPdf(3, (i) => lines[i]);
  save("corrupt.pdf", full.slice(0, Math.floor(full.length / 3)));
}
// 텍스트 파일에 .pdf 이름
writeFileSync(join(out, "fake.pdf"), "이것은 PDF가 아니라 그냥 텍스트 파일입니다.\n", "utf8");

// 암호 PDF: 표준 보안 핸들러(RC4 40bit)의 /Encrypt 사전을 가진 최소 PDF.
// 열람 암호가 필요하므로 pdf.js는 PasswordException을 낸다.
{
  const hex32 = (c) => c.repeat(32);
  save("encrypted.pdf", plainPdf([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>",
    `<< /Filter /Standard /V 1 /R 2 /O <${hex32("a")}> /U <${hex32("b")}> /P -4 >>`,
  ], ` /Encrypt 4 0 R /ID [<${hex32("c")}><${hex32("c")}>]`));
}
console.log("fixtures 생성 완료:", out);
