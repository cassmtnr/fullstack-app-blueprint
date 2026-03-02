# ---- Build stage ----
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json drizzle.config.ts ./
COPY src/ src/

RUN bun build src/index.ts --compile --outfile server

# ---- Runtime stage ----
FROM oven/bun:1-slim
WORKDIR /app

COPY --from=build /app/server .
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json .
COPY --from=build /app/drizzle.config.ts .
COPY --from=build /app/src src

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/api/v1/status').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["./server"]
