// Oracle for lightkone/library-merge: lightkone's own mergeLibraries(), unchanged.
import { mergeLibraries } from "lightkone/src/core/merge";
import { serve } from "./serve";

serve(({ base, ours, theirs }: any) => mergeLibraries(base ?? null, ours, theirs));
