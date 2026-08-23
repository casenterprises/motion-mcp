# Use a Node.js base image with npm built in
FROM node:20-alpine
# Install supergateway and the Motion MCP server globally
RUN npm install -g supergateway @rf-d/motion-mcp
# Render provides PORT as an environment variable
ENV PORT=8000
EXPOSE 8000
# Start supergateway, wrapping the Motion MCP server
CMD supergateway --stdio "MOTION_API_KEY=${MOTION_API_KEY} npx -y @rf-d/motion-mcp" --port
${PORT} --cors
