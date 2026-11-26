import { UploadForm } from "@/ui/components/UploadForm";

export default function Home() {
  return (
    <main className="page">
      <h1>PDF 요약</h1>
      <p className="lead">PDF를 올리면 한 줄 요약, 핵심 요점, 주요 키워드를 보여 드려요.</p>
      <UploadForm />
    </main>
  );
}
