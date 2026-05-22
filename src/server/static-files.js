const fs = require("node:fs/promises");
const path = require("node:path");

const { sendText } = require("./http-response");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

async function serveStaticFile(rootDir, urlPath, response) {
  const safePath = urlPath === "/" ? "/index.html" : urlPath;
  const decodedPath = decodeURIComponent(safePath);
  const resolvedRoot = path.resolve(rootDir);
  const relativeUrlPath = decodedPath.replace(/^[/\\]+/, "");
  const filePath = path.resolve(resolvedRoot, relativeUrlPath);
  const relativePath = path.relative(resolvedRoot, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
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
  } catch {
    sendText(response, 404, "Fichier introuvable.");
  }
}

module.exports = {
  serveStaticFile
};
