FROM node:20-slim

RUN apt-get update && apt-get install -y python3 python3-venv && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/mcp-proxy
RUN /opt/mcp-proxy/bin/pip install --upgrade pip
RUN /opt/mcp-proxy/bin/pip install "mcp<2.0.0"
RUN /opt/mcp-proxy/bin/pip install mcp-proxy

RUN npm install -g @rf-d/motion-mcp

ENV PATH="/opt/mcp-proxy/bin:$PATH"
ENV PORT=8000
EXPOSE 8000

CMD mcp-proxy --host=0.0.0.0 --port=8000 --allow-origin='*' --pass-environment -- motion-mcp
