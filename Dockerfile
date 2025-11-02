# --- Builder Stage ---
FROM node:22.4.1 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


# --- Runner Stage ---
FROM node:22.4.1 AS runner

# Install netcat for DB check
RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# Copy only what’s needed for production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/scripts ./scripts

# Ensure start.sh is executable
RUN chmod +x scripts/start.sh

EXPOSE 3000

# Use standalone server start
CMD ["./scripts/start.sh"]
