export type RssItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
};

/** Minimal RSS parser — no extra dependencies. */
export function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const chunks = xml.split(/<item[\s>]/i).slice(1);
  for (const chunk of chunks) {
    const block = chunk.split(/<\/item>/i)[0] ?? "";
    const title = extractTag(block, "title");
    const link = extractLink(block);
    if (!title || !link) continue;
    items.push({
      title: decodeEntities(stripTags(title)),
      link: link.trim(),
      pubDate: decodeEntities(stripTags(extractTag(block, "pubDate"))),
      description: decodeEntities(stripTags(extractTag(block, "description"))),
    });
  }
  return items;
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m?.[1]?.trim() ?? "";
}

function extractLink(block: string): string {
  const linkTag = extractTag(block, "link");
  if (linkTag) return linkTag;
  const guid = extractTag(block, "guid");
  if (guid.startsWith("http")) return guid;
  return "";
}

function stripTags(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export function googleNewsRssUrl(query: string): string {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}
