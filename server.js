const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);

    if (requestUrl.pathname === "/api/feed") {
      await handleFeedRequest(requestUrl, response);
      return;
    }

    await serveStaticFile(requestUrl.pathname, response);
  } catch (error) {
    sendJson(response, 500, { error: "Erreur serveur." });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`RSS Monitor: http://localhost:${PORT}`);
  });
}

async function handleFeedRequest(requestUrl, response) {
  const feedUrl = requestUrl.searchParams.get("url");

  if (!feedUrl) {
    sendJson(response, 400, { error: "Parametre url manquant." });
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(feedUrl);
  } catch {
    sendJson(response, 400, { error: "URL invalide." });
    return;
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    sendJson(response, 400, { error: "Seules les URL HTTP et HTTPS sont acceptees." });
    return;
  }

  let feedResponse;
  try {
    feedResponse = await fetch(parsedUrl, {
      headers: {
        "accept": "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "user-agent": "Mozilla/5.0 (compatible; rss-monitor/0.1; +https://localhost)"
      }
    });
  } catch (error) {
    sendJson(response, 502, { error: `Impossible de joindre le flux : ${error.message}` });
    return;
  }

  if (!feedResponse.ok) {
    sendJson(response, 502, { error: `Le flux a repondu avec le statut ${feedResponse.status}.` });
    return;
  }

  const xml = await feedResponse.text();
  const feed = parseFeed(xml);

  sendJson(response, 200, { feed });
}

async function serveStaticFile(urlPath, response) {
  const safePath = urlPath === "/" ? "/index.html" : urlPath;
  const decodedPath = decodeURIComponent(safePath);
  const filePath = path.normalize(path.join(ROOT, decodedPath));

  if (!filePath.startsWith(ROOT)) {
    sendText(response, 403, "Acces refuse.");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const contentType = MIME_TYPES[path.extname(filePath)] || "application/octet-stream";

    response.writeHead(200, {
      "content-type": contentType,
      "cache-control": "no-store"
    });
    response.end(content);
  } catch (error) {
    sendText(response, 404, "Fichier introuvable.");
  }
}

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
  const rawDescription = getTagContent(block, "description") || getTagContent(block, "summary") || getTagContent(block, "content") || getTagContent(block, "content:encoded");

  return {
    title: cleanText(getTagContent(block, "title")),
    link: cleanText(getTagContent(block, "link")) || getAttribute(linkTag, "href"),
    comments: cleanText(getTagContent(block, "comments")),
    pubDate: cleanText(getTagContent(block, "pubDate") || getTagContent(block, "published") || getTagContent(block, "updated")),
    description: cleanHtmlText(rawDescription),
    image: findImageUrl(block, rawDescription)
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
  return [...xml.matchAll(new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>`, "gi"))].map((match) => match[0]);
}

function getAttribute(tag, attributeName) {
  const match = tag.match(new RegExp(`${escapeRegExp(attributeName)}=["']([^"']+)["']`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

function findImageUrl(block, htmlContent) {
  const candidates = [
    ...getImageCandidatesFromTag(block, "media:content"),
    ...getImageCandidatesFromTag(block, "media:thumbnail"),
    ...getImageCandidatesFromTag(block, "enclosure"),
    getImageFromHtml(htmlContent)
  ];

  return candidates.find(isHttpUrl) || "";
}

function getImageCandidatesFromTag(block, tagName) {
  return getOpeningTags(block, tagName)
    .filter((tag) => tagName !== "enclosure" || getAttribute(tag, "type").startsWith("image/") || looksLikeImageUrl(getAttribute(tag, "url")))
    .map((tag) => getAttribute(tag, "url"))
    .filter(Boolean);
}

function getImageFromHtml(htmlContent) {
  const imgTag = getOpeningTag(String(htmlContent || ""), "img");
  return getAttribute(imgTag, "src");
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
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

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
  response.end(body);
}

module.exports = {
  parseFeed,
  server
};
