export type SummaryLength = "short" | "normal" | "long";

export interface Summary {
  oneLine: string;
  points: string[];
  keywords: string[];
  truncated: boolean;
}
