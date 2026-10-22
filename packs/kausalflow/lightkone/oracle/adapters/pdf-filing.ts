// Oracle for lightkone/pdf-filing: lightkone's own pdfLocation(), unchanged.
import { pdfLocation } from "lightkone/src/core/filing";
import type { Paper } from "lightkone/src/core/types";
import { serve } from "./serve";

serve(({ paper, library = [] }: { paper: Paper; library?: Paper[] }) => pdfLocation(paper, library));
