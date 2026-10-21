// Line protocol shared by every lightkone oracle adapter: one JSON request per
// line on stdin, one {"output": ...} or {"error": ...} reply per line on stdout.
import { createInterface } from "node:readline";

/** Thrown by an adapter when the contract says the input is invalid. */
export class ValueError extends Error {}

/** JSON null means "absent"; lightkone's types use undefined for that. */
export const dropNulls = <T>(v: T): T => {
  if (Array.isArray(v)) return v.map(dropNulls) as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null).map(([k, x]) => [k, dropNulls(x)])) as T;
  }
  return v;
};

export async function serve(run: (input: any) => unknown): Promise<void> {
  for await (const line of createInterface({ input: process.stdin })) {
    let reply: unknown;
    try {
      reply = { output: run(dropNulls(JSON.parse(line))) };
    } catch (e) {
      const err = e as Error;
      reply = { error: { type: err instanceof ValueError ? "ValueError" : err.name || "Error", message: err.message } };
    }
    process.stdout.write(JSON.stringify(reply) + "\n");
  }
}
