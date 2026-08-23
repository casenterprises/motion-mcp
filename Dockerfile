FROM python:3.13-alpine

# Install Node.js (needed for the Motion MCP server)
RUN apk add --no-cache nodejs npm

# Install mcp-proxy (Python) and the Motion MCP server (Node)
RUN pip install mcp-proxy
RUN npm install -g @rf-d/motion-mcp

ENV PORT=8000
EXPOSE 8000

# mcp-proxy spawns a fresh motion-mcp process per SSE connection
CMD mcp-proxy --host=0.0.0.0 --port=8000 --allow-origin='*' -- motion-mcp
