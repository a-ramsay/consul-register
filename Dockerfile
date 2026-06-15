FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json pnpm-*.yaml ./
RUN corepack enable && pnpm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS runner
LABEL org.opencontainers.image.source=https://github.com/a-ramsay/consul-register
WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-*.yaml ./
RUN corepack enable && pnpm ci --prod

COPY --from=builder /app/dist ./

CMD ["node", "app.js"]