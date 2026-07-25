# Build client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Production
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist
RUN mkdir -p /app/data
ENV DATA_DIR=/app/data
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/index.js"]
