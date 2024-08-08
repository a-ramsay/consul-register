FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
LABEL org.opencontainers.image.source https://github.com/a-ramsay/consul-register
WORKDIR /app

ENV NODE_ENV production

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./

CMD ["node", "app.js"]