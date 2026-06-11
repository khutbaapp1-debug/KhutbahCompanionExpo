// Normalized shape used by SummaryModal — fields are always plain strings/arrays.
export type SummarySchema = {
  shortSummary?: string;
  detailedSummary?: string;
  mainThemes?: string[];
  keyPoints?: string[];
  actionPoints?: string[];
};

// Raw wire shape returned by /api/summarise.
// summary is a nested SermonSummary object; actionPoints are ActionPoint objects.
export type SummariseResponse = {
  summary?: {
    mainThemes?: unknown;
    keyPoints?: unknown;
    shortSummary?: unknown;
    detailedSummary?: unknown;
  };
  actionPoints?: Array<{ content?: unknown; category?: unknown }>;
};
