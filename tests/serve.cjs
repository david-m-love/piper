// A tiny static file server for the tests (headless Chromium sometimes drops a recent localStorage write across a reload
// on file:// pages, which is a browser quirk; over http it is reliable). Usage: const s = await serve(dir); s.base; s.close()
const http = require("http");
const fs = require("fs");
const path = require("path");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
module.exports = function serve(dir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
      const file = path.join(dir, path.normalize(rel).replace(/^(\.\.[/\\])+/, ""));
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end("Not found"); return; }
        res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
        res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve({ base: `http://localhost:${server.address().port}`, close: () => server.close() }));
  });
};
