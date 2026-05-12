// Simple static file server + Anthropic API proxy for local development
// Usage: node server.js
// Then open http://localhost:3000

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT     = 3000;
const APP_DIR  = path.join(__dirname, 'App');
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
  const urlPath = req.url.split('?')[0];

  // ── Anthropic API proxy ─────────────────────────────────────────────────
  if (req.method === 'POST' && urlPath === '/api/claude') {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Missing x-api-key header' } }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const bodyBuf = Buffer.from(body);
      const options = {
        hostname: 'api.anthropic.com',
        path:     '/v1/messages',
        method:   'POST',
        headers:  {
          'Content-Type':    'application/json',
          'x-api-key':       apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length':  bodyBuf.length,
        },
      };

      const proxyReq = https.request(options, proxyRes => {
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
        proxyRes.pipe(res);
      });

      proxyReq.on('error', err => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: err.message } }));
      });

      proxyReq.write(bodyBuf);
      proxyReq.end();
    });
    return;
  }

  // ── Static files ────────────────────────────────────────────────────────
  let servePath = urlPath === '/' ? '/index.html' : urlPath;
  let filePath;
  if (servePath.startsWith('/data/')) {
    filePath = path.join(DATA_DIR, servePath.slice('/data'.length));
  } else if (servePath.startsWith('/floorplans/')) {
    filePath = path.join(__dirname, servePath);
  } else {
    filePath = path.join(APP_DIR, servePath);
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);

}).listen(PORT, () => {
  console.log(`Perch running at        http://localhost:${PORT}`);
  console.log(`Admin console at        http://localhost:${PORT}/admin.html`);
  console.log('Press Ctrl+C to stop.');
});
