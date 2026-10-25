# library-merge: notes

API: `mergeLibraries(base: Library | null, ours: Library, theirs: Library): { file, fromThem }`; `run({base?, ours, theirs})`.

Readings chosen:
- **Extra top-level keys** (anything other than format/version/papers/bibSync, written by other tools and kept by library-file): merged with the same three-way rule as a paper field: theirs' value unless ours' differs from base's (a missing key counts as a value), and a key absent from the chosen side is left out. A key only in base is dropped, like ids only in base. They are written after `bibSync`. The contract's inputs never carry such keys, so checked behaviour is unaffected.
- `bibSync: null` is treated as missing (= empty list); an empty result is omitted.
- tags/folders use the set rule whenever either side has the list (a missing list counts as empty, example 21); set membership is by value. When neither side has it, the ordinary field rule applies (so it stays absent).
- The set rule (and dedup) applies only in the field-by-field branch; when only one side changed a paper, that side's paper is taken verbatim, as the description says.
- Key order of a field-merged paper: ours' keys, then keys only theirs has. Equality ignores key order.
- Fields are set with `defineProperty`, so a key such as `__proto__` is kept rather than lost.
- Rejected input (ValueError): papers not a list, missing/duplicate/non-string ids, null field values, unknown format/version.
- No flags filed.
