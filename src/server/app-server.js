const http = require("node:http");
const path = require("node:path");

const { parseFeed } = require("./feed-parser");
const { sendJson } = require("./http-response");
const { serveStaticFile } = require("./static-files");

const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

function createServer(options = {}) {
  const publicDir = options.publicDir || PUBLIC_DIR;

  return http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, `http://${request.headers.host}`);

      if (requestUrl.pathname === "/api/feed") {
        await handleFeedRequest(requestUrl, response);
        return;
      }

      await serveStaticFile(publicDir, requestUrl.pathname, response);
    } catch (error) {
      sendJson(response, 500, { error: "Erreur serveur." });
    }
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

module.exports = {
  createServer
};
