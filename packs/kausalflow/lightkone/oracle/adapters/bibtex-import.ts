// Oracle for lightkone/bibtex-import: lightkone's own parseBibtexToDrafts(), unchanged.
import { parseBibtexToDrafts } from "lightkone/src/core/bibtex";
import { serve } from "./serve";

serve(({ text }: { text: string }) => ({ papers: parseBibtexToDrafts(text) }));
