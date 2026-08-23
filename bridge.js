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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
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

function handleSSE(req, res) {
  const sessionId = Math.random().toString(36).substring(2, 15);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Spawn a fresh stdio process for this session
  const child = spawn('npx', ['-y', '@rf-d/motion-mcp'], {
    env: { ...process.env, MOTION_API_KEY },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  sessions.set(sessionId, { child, res });

  // Send endpoint event
  const messageUrl = `/message?session=${sessionId}`;
  res.write(`event: endpoint\ndata: ${messageUrl}\n\n`);

  // Forward stdout lines to SSE events
  let buffer = '';
  child.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.trim()) {
        res.write(`data: ${line}\n\n`);
      }
    }
  });

  // Log stderr
  child.stderr.on('data', (data) => {
    console.error(`[child] ${data.toString().trim()}`);
  });

  // Clean up on disconnect
  req.on('close', () => {
    child.kill();
    sessions.delete(sessionId);
    console.log(`Session ${sessionId} closed`);
  });

  child.on('exit', () => {
    res.end();
    sessions.delete(sessionId);
  });
}

function handleMessage(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get('session');
  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404);
    res.end('Session not found');
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    session.child.stdin.write(body + '\n');
    res.writeHead(202);
    res.end('Accepted');
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Bridge server listening on port ${PORT}`);
});
