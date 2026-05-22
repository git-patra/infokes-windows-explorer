# Stage 1: Build
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy workspace config first for layer caching
COPY package.json bun.lock ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY apps/web/package.json apps/web/

RUN bun install --frozen-lockfile

# Copy source
COPY packages/contracts/ packages/contracts/
COPY packages/tsconfig/ packages/tsconfig/
COPY apps/web/ apps/web/

WORKDIR /app/apps/web
RUN bun run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
