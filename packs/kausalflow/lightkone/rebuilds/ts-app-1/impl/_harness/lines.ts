// Symbola's line protocol: one JSON input per line on stdin, one
// {"output": ...} or {"error": {...}} per line on stdout.
import { createInterface } from "node:readline";

/** Thrown for input the contract rejects; reported to the harness as ValueError. */
export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValueError";
  }
}

export function serve(run: (input: any) => unknown): void {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on("line", (line) => {
    if (!line.trim()) return;
    let reply: unknown;
    try {
      reply = { output: run(JSON.parse(line)) };
    } catch (e) {
      const err = e as Error;
      const type = err instanceof ContractError ? "ValueError" : err?.name || "Error";
      reply = { error: { type, message: String(err?.message ?? err) } };
    }
    process.stdout.write(JSON.stringify(reply) + "\n");
  });
}
