import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF 요약",
  description: "PDF를 올리면 한 줄 요약, 핵심 요점, 키워드를 보여 줍니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
