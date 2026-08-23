FROM node:20-slim

# Install Python + pip properly
RUN apt-get update && apt-get install -y python3 python3-venv && rm -rf /var/lib/apt/lists/*

# Create a virtualenv for mcp-proxy (avoids system Python conflicts)
RUN python3 -m venv /opt/mcp-proxy
RUN /opt/mcp-proxy/bin/pip install --upgrade pip
RUN /opt/mcp-proxy/bin/pip install mcp-proxy

# Install the Motion MCP server
RUN npm install -g @rf-d/motion-mcp

# Make mcp-proxy available in PATH
ENV PATH="/opt/mcp-proxy/bin:$PATH"
ENV PORT=8000
EXPOSE 8000

CMD mcp-proxy --host=0.0.0.0 --port=8000 --allow-origin='*' -- motion-mcp
