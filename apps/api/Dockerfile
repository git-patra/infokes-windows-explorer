FROM oven/bun:1-alpine
WORKDIR /app

# Copy workspace config first for layer caching
COPY package.json bun.lock ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN bun install --frozen-lockfile

# Copy source
COPY packages/contracts/ packages/contracts/
COPY packages/tsconfig/ packages/tsconfig/
COPY apps/api/ apps/api/

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["bun", "run", "src/main.ts"]
