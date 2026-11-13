const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT) || 4173;
const publicFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);

function send(response, status, type, body) {
  response.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  response.end(body);
}

const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET') {
    send(response, 405, 'text/plain; charset=utf-8', 'Method not allowed');
    return;
  }

  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/favicon.ico') {
    response.writeHead(204, { 'Cache-Control': 'no-store' });
    response.end();
    return;
  }

  if (pathname === '/api/state') {
    try {
      const [stateText, eventText] = await Promise.all([
        fs.readFile(path.join(root, '.concord', 'WORK_STATE.json'), 'utf8'),
        fs.readFile(path.join(root, '.concord', 'events.jsonl'), 'utf8').catch(() => ''),
      ]);
      const events = eventText.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
      send(response, 200, 'application/json; charset=utf-8', JSON.stringify({
        repository: path.basename(root),
        state: JSON.parse(stateText),
        events,
      }));
    } catch (error) {
      send(response, 503, 'application/json; charset=utf-8', JSON.stringify({
        error: 'No se pudo leer el estado local de Concord.',
      }));
    }
    return;
  }

  const file = publicFiles.get(pathname);
  if (!file) {
    send(response, 404, 'text/plain; charset=utf-8', 'Not found');
    return;
  }

  try {
    const content = await fs.readFile(path.join(root, file[0]));
    send(response, 200, file[1], content);
  } catch {
    send(response, 404, 'text/plain; charset=utf-8', 'Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`ORBIT demo listening at http://127.0.0.1:${port}`);
  console.log('Concord workspace state is read locally from .concord/.');
  console.log('Press Ctrl+C to stop.');
});
