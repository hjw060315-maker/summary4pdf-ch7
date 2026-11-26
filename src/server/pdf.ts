import { extractText as unpdfExtractText, getDocumentProxy } from "unpdf";
import { MAX_PAGES } from "@/shared/constants";
import { AppError } from "@/shared/errors";

const MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

type PdfDoc = Awaited<ReturnType<typeof getDocumentProxy>>;

function assertPdfHeader(data: Uint8Array): void {
  if (data.length < MAGIC.length || !MAGIC.every((b, i) => data[i] === b)) {
    throw new AppError("NOT_PDF");
  }
}

// pdf.js가 버퍼를 가져가 비울 수 있어 복사본을 넘긴다.
async function openDocument(data: Uint8Array): Promise<PdfDoc> {
  assertPdfHeader(data);
  try {
    return await getDocumentProxy(new Uint8Array(data));
  } catch (e) {
    console.warn("[pdf] open failed:", e instanceof Error ? e.name : "UnknownError");
    // 암호(PasswordException)·손상(InvalidPDFException 등) 모두 읽을 수 없는 파일
    throw new AppError("UNREADABLE_PDF");
  }
}

async function release(pdf: PdfDoc): Promise<void> {
  try {
    await pdf.cleanup?.();
  } catch {
    // 정리 실패는 결과에 영향이 없다
  }
}

export async function countPages(data: Uint8Array): Promise<number> {
  const pdf = await openDocument(data);
  try {
    return pdf.numPages;
  } finally {
    await release(pdf);
  }
}

export async function extractText(
  data: Uint8Array,
): Promise<{ text: string; pageCount: number }> {
  const pdf = await openDocument(data);
  try {
    const pageCount = pdf.numPages;
    if (pageCount === 0) throw new AppError("EMPTY_PDF");
    if (pageCount > MAX_PAGES) throw new AppError("TOO_MANY_PAGES");

    let text: string;
    try {
      const result = await unpdfExtractText(pdf, { mergePages: true });
      text = result.text;
    } catch (e) {
      console.warn("[pdf] extract failed:", e instanceof Error ? e.name : "UnknownError");
      throw new AppError("UNREADABLE_PDF");
    }
    if (text.replace(/\s/g, "").length === 0) throw new AppError("NO_TEXT");
    return { text, pageCount };
  } finally {
    await release(pdf);
  }
}
