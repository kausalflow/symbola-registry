// Oracle for lightkone/bibtex-export: lightkone's own paperToBibtex(), unchanged.
import { paperToBibtex } from "lightkone/src/core/bibtex";
import type { Paper } from "lightkone/src/core/types";
import { serve } from "./serve";

serve(({ paper }: { paper: Paper }) => ({ text: paperToBibtex(paper) }));
