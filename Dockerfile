FROM node:20-alpine

WORKDIR /app

# Install the Motion MCP server globally
RUN npm install -g @rf-d/motion-mcp

# Copy the custom bridge script
COPY bridge.js .

ENV PORT=8000
EXPOSE 8000

CMD node bridge.js
