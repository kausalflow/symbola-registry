# library-file notes

- The JSON text comes from native `JSON.parse` and `JSON.stringify(x, null, 1)`. JS semantics are the spec here: number printing, -0 -> 0, the last of repeated keys in the first one's place, integer-like keys first, and the escaping rules.
- `"papers": ""` is out of scope (schema.py says lightkone happens to accept it). This build refuses it like any other non-list.
- A paper that is an array is refused as "not an object".
- `bibSync` is written only when it is a non-empty array. Any other value (out of scope) is dropped.
- `version` is refused only when it is a number above 1. Anything else is written as 1.
- `saveLibrary(data, null)` (no file stored yet) always writes.
- `loadLibrary` adds `folders` to the parsed objects in place, so the new key comes after a paper's existing keys.
- Trash: `!p.trashed`, which is JS truthiness.
- No flags filed.
