import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 4173;
const maxEvents = 100;

const publicFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/src/data/concordRepository.js', ['src/data/concordRepository.js', 'text/javascript; charset=utf-8']],
  ['/src/domain/workspace.js', ['src/domain/workspace.js', 'text/javascript; charset=utf-8']],
  ['/src/ui/components.js', ['src/ui/components.js', 'text/javascript; charset=utf-8']],
  ['/src/ui/icons.js', ['src/ui/icons.js', 'text/javascript; charset=utf-8']],
  ['/src/ui/renderWorkspace.js', ['src/ui/renderWorkspace.js', 'text/javascript; charset=utf-8']],
]);

function send(response, status, type, body) {
  response.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });
  response.end(body);
}

function safeEvent(line) {
  try {
    const event = JSON.parse(line);
    return {
      task_id: typeof event.task_id === 'string' ? event.task_id : '',
      tool: typeof event.tool === 'string' ? event.tool : '',
      status: typeof event.status === 'string' ? event.status : '',
      created_at: typeof event.created_at === 'string' ? event.created_at : null,
    };
  } catch {
    return null;
  }
}

function safeWorkspace(state) {
  return {
    generated_at: typeof state.generated_at === 'string' ? state.generated_at : null,
    tasks: Array.isArray(state.tasks) ? state.tasks.map((task) => ({
      task_id: typeof task.task_id === 'string' ? task.task_id : '',
      title: typeof task.title === 'string' ? task.title : '',
      status: typeof task.status === 'string' ? task.status : 'todo',
      agent: typeof task.agent === 'string' ? task.agent : '',
      updated_at: typeof task.updated_at === 'string' ? task.updated_at : null,
      modules: Array.isArray(task.modules) ? task.modules.filter((value) => typeof value === 'string') : [],
    })) : [],
    presence: Array.isArray(state.presence) ? state.presence.map((agent) => ({
      kind: typeof agent.kind === 'string' ? agent.kind : 'Agente',
      summary: typeof agent.summary === 'string' ? agent.summary : '',
      execution_status: typeof agent.execution_status === 'string' ? agent.execution_status : '',
      liveness: typeof agent.liveness === 'string' ? agent.liveness : 'unknown',
      last_seen: typeof agent.last_seen === 'string' ? agent.last_seen : null,
    })) : [],
  };
}

async function readWorkspaceFeed() {
  const [stateText, eventText] = await Promise.all([
    fs.readFile(path.join(root, '.concord', 'WORK_STATE.json'), 'utf8'),
    fs.readFile(path.join(root, '.concord', 'events.jsonl'), 'utf8').catch(() => ''),
  ]);
  const state = JSON.parse(stateText);
  const lines = eventText.split(/\r?\n/).filter(Boolean);
  const events = lines.slice(-maxEvents).map(safeEvent).filter(Boolean);
  return {
    repository: path.basename(root),
    state: safeWorkspace(state),
    eventCount: lines.length,
    events,
  };
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
      const payload = await readWorkspaceFeed();
      send(response, 200, 'application/json; charset=utf-8', JSON.stringify(payload));
    } catch {
      send(response, 503, 'application/json; charset=utf-8', JSON.stringify({
        error: 'No se pudo leer el feed local de Concord.',
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
  console.log(`ORBIT local dashboard: http://127.0.0.1:${port}`);
  console.log('Reading only Concord workspace presence, tasks, and workflow event metadata.');
  console.log('Press Ctrl+C to stop.');
});
