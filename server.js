// Simple static file server for local development
// Usage: node server.js
// Then open http://localhost:3000

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT    = 3000;
const APP_DIR = path.join(__dirname, 'App');
const DATA_DIR = path.join(__dirname, 'data');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  // Resolve to App/ first, then data/ for data files
  let filePath = path.join(APP_DIR, urlPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DATA_DIR, urlPath);
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
}).listen(PORT, () => {
  console.log(`Perch running at http://localhost:${PORT}`);
  console.log(`Admin console: http://localhost:${PORT}/admin.html`);
  console.log('Press Ctrl+C to stop.');
});
