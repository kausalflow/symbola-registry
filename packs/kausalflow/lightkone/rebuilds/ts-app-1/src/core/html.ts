// Small HTML helpers that need no DOM, so they also run in the MCP endpoint.

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/** <meta name|property=... content=...> values, by lower-cased name, in order. */
export function metaTags(html: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of html.matchAll(/<meta\s[^>]*>/gi)) {
    const tag = m[0];
    const name = /(?:name|property)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    const content = /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(tag);
    if (!name || !content) continue;
    const v = decodeEntities(content[1] ?? content[2] ?? "").trim();
    if (!v) continue;
    out.set(name, [...(out.get(name) ?? []), v]);
  }
  return out;
}

export function pageTitle(html: string): string {
  const meta = metaTags(html);
  return meta.get("og:title")?.[0] ?? meta.get("twitter:title")?.[0] ?? stripTags(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
}

/** The page's main text as Markdown: headings, paragraphs, lists, links, code. */
export function htmlToMarkdown(html: string, baseUrl?: string): string {
  let body = html.replace(/<!--[\s\S]*?-->/g, "");
  body = body.replace(/<(script|style|noscript|template|svg|iframe|form|nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi, "");
  const pick = /<article\b[\s\S]*<\/article>/i.exec(body) ?? /<main\b[\s\S]*<\/main>/i.exec(body) ?? /<body\b[\s\S]*<\/body>/i.exec(body);
  if (pick) body = pick[0];
  const abs = (href: string) => {
    try {
      return baseUrl ? new URL(href, baseUrl).href : href;
    } catch {
      return href;
    }
  };
  const inline = (s: string) =>
    s
      .replace(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
        const t = stripTags(text);
        return t ? `[${t}](${abs(decodeEntities(href))})` : "";
      })
      .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => `**${stripTags(t)}**`)
      .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => `*${stripTags(t)}*`)
      .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, t) => "`" + stripTags(t) + "`")
      .replace(/<br\s*\/?>/gi, "\n");
  const blocks: string[] = [];
  const re = /<(h[1-6]|p|li|pre|blockquote|dt|dd|td|th|figcaption)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const m of body.matchAll(re)) {
    const tag = m[1].toLowerCase();
    if (tag === "pre") {
      blocks.push("```\n" + decodeEntities(m[2].replace(/<[^>]*>/g, "")).trim() + "\n```");
      continue;
    }
    const text = stripTags(inline(m[2]).replace(/\n/g, " \u0001 ")).replace(/ ?\u0001 ?/g, "  \n");
    if (!text) continue;
    if (tag[0] === "h") blocks.push(`${"#".repeat(Number(tag[1]))} ${text}`);
    else if (tag === "li") blocks.push(`- ${text}`);
    else if (tag === "blockquote") blocks.push(`> ${text}`);
    else blocks.push(text);
  }
  if (!blocks.length) return stripTags(body);
  // Lists stay tight; everything else is separated by a blank line.
  let out = "";
  blocks.forEach((b, i) => {
    if (i) out += b.startsWith("- ") && blocks[i - 1].startsWith("- ") ? "\n" : "\n\n";
    out += b;
  });
  return out + "\n";
}
