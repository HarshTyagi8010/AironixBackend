FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000
CMD ["node", "server.js"]