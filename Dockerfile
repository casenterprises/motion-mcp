FROM node:20-alpine

RUN npm install -g supergateway @rf-d/motion-mcp

ENV PORT=8000
EXPOSE 8000

CMD supergateway --stdio "MOTION_API_KEY=${MOTION_API_KEY} npx -y @rf-d/motion-mcp" --port ${PORT} --cors
