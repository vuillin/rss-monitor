function parseFeed(xml) {
  const itemBlocks = getTagContents(xml, "item");
  const entryBlocks = getTagContents(xml, "entry");
  const blocks = itemBlocks.length > 0 ? itemBlocks : entryBlocks;

  return {
    items: blocks.map(parseFeedItem).filter((item) => item.title || item.link)
  };
}

function parseFeedItem(block) {
  const linkTag = getOpeningTag(block, "link");
  const rawDescription = getTagContent(block, "description") ||
    getTagContent(block, "summary") ||
    getTagContent(block, "content") ||
    getTagContent(block, "content:encoded");

  return {
    title: cleanText(getTagContent(block, "title")),
    link: cleanText(getTagContent(block, "link")) || getAttribute(linkTag, "href"),
    comments: cleanText(getTagContent(block, "comments")),
    pubDate: cleanText(getTagContent(block, "pubDate") || getTagContent(block, "published") || getTagContent(block, "updated")),
    description: cleanHtmlText(rawDescription),
    image: findImageUrl(block)
  };
}

function getTagContent(xml, tagName) {
  const match = xml.match(new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`, "i"));
  return match ? match[1] : "";
}

function getTagContents(xml, tagName) {
  return [...xml.matchAll(new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`, "gi"))].map((match) => match[1]);
}

function getOpeningTag(xml, tagName) {
  const match = xml.match(new RegExp(`<${escapeRegExp(tagName)}\\b([^>]*)>`, "i"));
  return match ? match[0] : "";
}

function getOpeningTags(xml, tagName) {
  return [...String(xml || "").matchAll(new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>`, "gi"))].map((match) => match[0]);
}

function getAttribute(tag, attributeName) {
  const match = String(tag || "").match(new RegExp(`${escapeRegExp(attributeName)}=["']([^"']+)["']`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

function findImageUrl(block) {
  const candidates = [
    ...getImageCandidatesFromTag(block, "media:content"),
    ...getImageCandidatesFromTag(block, "media:thumbnail"),
    ...getImageCandidatesFromTag(block, "enclosure")
  ];

  return candidates.find(isHttpImageUrl) || "";
}

function getImageCandidatesFromTag(block, tagName) {
  return getOpeningTags(block, tagName)
    .filter((tag) => tagName !== "enclosure" || getAttribute(tag, "type").startsWith("image/") || looksLikeImageUrl(getAttribute(tag, "url")))
    .map((tag) => getAttribute(tag, "url"))
    .filter(Boolean);
}

function isHttpImageUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && looksLikeImageUrl(url.href);
  } catch {
    return false;
  }
}

function looksLikeImageUrl(value) {
  return /\.(avif|gif|jpe?g|png|webp)(\?|#|$)/i.test(value);
}

function cleanText(value) {
  return decodeEntities(String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/\s+/g, " ")
    .trim());
}

function cleanHtmlText(value) {
  const html = cleanText(value)
    .replace(/<p>\s*Article URL:[\s\S]*?<\/p>/gi, "")
    .replace(/<p>\s*Comments URL:[\s\S]*?<\/p>/gi, "");

  const text = cleanText(stripHtml(html))
    .replace(/\bArticle URL:\s*/i, "")
    .replace(/\bComments URL:\s*Comments\b/i, "")
    .trim();

  return text.toLowerCase() === "comments" ? "" : text;
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]*>/g, " ");
}

function decodeEntities(value) {
  const entities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\""
  };

  return String(value || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code) => {
    if (code[0] === "#") {
      const isHex = code[1].toLowerCase() === "x";
      const value = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : entity;
    }

    return entities[code.toLowerCase()] || entity;
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  parseFeed
};
