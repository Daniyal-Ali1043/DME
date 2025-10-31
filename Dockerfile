# syntax=docker/dockerfile:1

# ---------- deps: install all node_modules (dev + prod) ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /app
# Some packages need basic build tools
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
# Install *all* deps (dev included) so tools like drizzle-kit are present
RUN npm ci

# ---------- builder: compile Next.js ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- runner: minimal runtime (Next standalone) ----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]

# ---------- devtools: tools image with code + node_modules ----------
# Used by one-off tasks like DB migrations, codegen, seeding, etc.
FROM node:20-bookworm-slim AS devtools
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# default command can be overridden by docker compose
CMD ["bash"]
