FROM node:20-alpine
WORKDIR /app
RUN npm install -g @rf-d/motion-mcp
COPY bridge.js .
ENV PORT=8000
EXPOSE 8000
CMD node bridge.js
