// Canonical type for the /api/summarise response.
// The backend returns a structured object; we also keep legacy fields
// for any environments that still emit the old flat shape.
export type SummarySchema = {
  // Structured fields (current API)
  shortSummary?: string;
  detailedSummary?: string;
  mainThemes?: string | string[];
  keyPoints?: string | string[];
  // Legacy flat fields (old API — kept for backwards compatibility)
  summary?: string;
  actionPoints?: string[];
};
