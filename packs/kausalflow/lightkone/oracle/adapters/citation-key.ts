// Oracle for lightkone/citation-key: how Library.merge gives keys to new papers, with lightkone's own makeKey().
import { makeKey } from "lightkone/src/core/library";
import type { PaperDraft } from "lightkone/src/core/types";
import { serve } from "./serve";

serve(({ drafts, taken = [] }: { drafts: PaperDraft[]; taken?: string[] }) => {
  const keys = new Set(taken);
  return {
    keys: drafts.map((d) => {
      const key = d.key && !keys.has(d.key) ? d.key : makeKey(d, keys);
      keys.add(key);
      return key;
    }),
  };
});
