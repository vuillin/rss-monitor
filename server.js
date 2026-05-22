const { createServer } = require("./src/server/app-server");
const { parseFeed } = require("./src/server/feed-parser");

const PORT = Number(process.env.PORT || 3000);
const server = createServer();

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`RSS Monitor: http://localhost:${PORT}`);
  });
}

module.exports = {
  parseFeed,
  server
};
