FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY src ./src
COPY migrations ./migrations
COPY scripts ./scripts

ENV NODE_ENV=production
EXPOSE 5001

CMD ["node", "src/server.js"]
