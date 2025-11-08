# --- Builder Stage ---
FROM node:22.4.1-bullseye AS builder

WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
RUN apt-get update && \
    apt-get install -y build-essential python3 make g++ && \
    npm ci && \
    rm -rf /var/lib/apt/lists/*

# Copy project files and build Next.js
COPY . .
RUN npm run build

# --- Runner Stage ---
FROM node:22.4.1-bullseye AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install netcat for PostgreSQL health checks
RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

# Copy only what’s needed for runtime
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/scripts ./scripts

RUN chmod +x scripts/start.sh

EXPOSE 3000
CMD ["./scripts/start.sh"]
