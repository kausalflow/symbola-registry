// Oracle for lightkone/library-file: lightkone's own Library.load() then
// Library.save(), unchanged, against storage that holds only library.json.
import { BIB_PATH, LIBRARY_PATH, Library } from "lightkone/src/core/library";
import { ValueError, serve } from "./serve";

serve(async ({ text }: { text: string }) => {
  const files = new Map<string, string>([[LIBRARY_PATH, text]]);
  const written = new Set<string>();
  const storage = {
    read: async (path: string) => (files.has(path) ? new TextEncoder().encode(files.get(path)) : null),
    write: async (path: string, data: string) => {
      files.set(path, data);
      written.add(path);
    },
  };
  const lib = new Library(storage as any);
  let foldered: number;
  try {
    ({ foldered } = await lib.load());
  } catch (e) {
    // Text that is not a lightkone library: lightkone stops with an error and writes nothing.
    throw new ValueError((e as Error).message);
  }
  await lib.save();
  return {
    written: written.has(LIBRARY_PATH),
    library: files.get(LIBRARY_PATH),
    bib: files.get(BIB_PATH) ?? null,
    foldered,
  };
});
