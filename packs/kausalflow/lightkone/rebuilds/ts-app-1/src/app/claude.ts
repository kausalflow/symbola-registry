// The Anthropic API, called from the browser with the owner's own key
// (PRODUCT.md, Outside services). The key never goes to the site.
import type { Paper } from "../core/types.ts";

export const DEFAULT_MODEL = "claude-sonnet-5-5";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function claude(key: string, system: string, messages: Message[], opts: { model?: string; maxTokens?: number } = {}): Promise<string> {
  if (!key) throw new Error("Add your Claude key in Settings first.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model: opts.model || DEFAULT_MODEL, max_tokens: opts.maxTokens ?? 1500, system, messages }),
  });
  const body = (await res.json().catch(() => ({}))) as { content?: { type: string; text?: string }[]; error?: { message?: string } };
  if (!res.ok) throw new Error(body.error?.message ?? `Claude answered ${res.status}`);
  return (body.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");
}

export function paperContext(p: Paper, text?: string | null, maxChars = 60_000): string {
  const head = [
    `Title: ${p.title}`,
    p.authors.length ? `Authors: ${p.authors.join("; ")}` : "",
    p.year ? `Year: ${p.year}` : "",
    p.venue ? `Venue: ${p.venue}` : "",
    `Citation key: ${p.key}`,
    p.abstract ? `Abstract: ${p.abstract}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return text ? `${head}\n\nText:\n${text.slice(0, maxChars)}` : head;
}
