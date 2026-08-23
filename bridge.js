const http = require('http');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 8000;
const MOTION_API_KEY = process.env.MOTION_API_KEY;

if (!MOTION_API_KEY) {
  console.error('MOTION_API_KEY is required');
  process.exit(1);
}

const sessions = new Map();

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', sessions: sessions.size }));
    return;
  }

  if (req.url === '/sse') {
    handleSSE(req, res);
    return;
  }

  if (req.url.startsWith('/message')) {
    handleMessage(req, res);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

function getBaseUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return `${protocol}://${host}`;
}

function handleSSE(req, res) {
  const sessionId = Math.random().toString(36).substring(2, 15);
  const baseUrl = getBaseUrl(req);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const child = spawn('motion-mcp', [], {
    env: { ...process.env, MOTION_API_KEY },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  sessions.set(sessionId, { child, res });
  console.log(`Session ${sessionId} started`);

  const messageUrl = `${baseUrl}/message?session=${sessionId}`;
  res.write(`event: endpoint\ndata: ${messageUrl}\n\n`);

  let buffer = '';
  child.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('{')) {
        res.write(`data: ${trimmed}\n\n`);
      } else {
        console.log(`[child stdout non-json] ${trimmed}`);
      }
    }
  });

  child.stderr.on('data', (data) => {
    console.error(`[child stderr] ${data.toString().trim()}`);
  });

  req.on('close', () => {
    console.log(`Session ${sessionId} closed by client`);
    child.kill('SIGTERM');
    sessions.delete(sessionId);
  });

  child.on('error', (err) => {
    console.error(`[child error] ${err.message}`);
    sessions.delete(sessionId);
    res.end();
  });

  child.on('exit', (code, signal) => {
    console.log(`[child exit] code=${code} signal=${signal}`);
    sessions.delete(sessionId);
    res.end();
  });
}

function handleMessage(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get('session');
  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Session not found');
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    console.log(`[message] session=${sessionId} body=${body.substring(0, 200)}`);
    try {
      JSON.parse(body);
      session.child.stdin.write(body + '\n');
      res.writeHead(202, { 'Content-Type': 'text/plain' });
      res.end('Accepted');
    } catch (err) {
      console.error(`[message] Invalid JSON: ${err.message}`);
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request: Invalid JSON');
    }
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Bridge server listening on port ${PORT}`);
});
