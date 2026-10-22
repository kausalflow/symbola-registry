// Oracle for lightkone/tidy: lightkone's own findDuplicates(), pickKeeper() and mergeInto().
import { findDuplicates, mergeInto, pickKeeper } from "lightkone/src/core/tidy";
import type { Paper } from "lightkone/src/core/types";
import { serve } from "./serve";

serve(({ papers }: { papers: Paper[] }) => ({
  groups: findDuplicates(papers).map((group) => {
    const keep = pickKeeper(group);
    return { ids: group.map((p) => p.id), keep: keep.id, patch: mergeInto(keep, group.filter((p) => p !== keep)) };
  }),
}));
