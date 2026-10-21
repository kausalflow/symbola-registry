// Oracle for lightkone/search-query: lightkone's own search(), unchanged.
import { search } from "lightkone/src/core/search";
import type { Paper } from "lightkone/src/core/types";
import { serve } from "./serve";

serve(({ papers, query, sort }: { papers: Partial<Paper>[]; query: string; sort?: string }) => {
  const full = papers.map((p) => ({ key: "", type: "misc", authors: [], tags: [], fields: {}, ...p }) as Paper);
  return { ids: search(full, query, (sort ?? "added") as any).map((p) => p.id) };
});
