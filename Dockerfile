# Base Image
FROM node:20-alpine AS builder

# Install build dependencies (needed for Prisma, native modules, and git)
RUN apk add --no-cache python3 make g++ git openssl

WORKDIR /app

# Clone the Backend scraper repository
RUN git clone https://github.com/minasamir1401/otakuworld-back.git /app/Backend

# Copy package configurations for FRONT END (context is the frontend repo root)
COPY package*.json ./Frontend/

# Install dependencies for both Backend and Frontend
WORKDIR /app/Backend
RUN npm ci

WORKDIR /app/Frontend
RUN npm ci

# Copy source code for Frontend
COPY . /app/Frontend

# Generate Prisma clients for both Backend and Frontend
WORKDIR /app/Backend
RUN npx prisma generate

WORKDIR /app/Frontend
RUN npx prisma generate

# Push schema changes to database (creates AppConfig table if needed)
# DATABASE_URL comes from the .env file copied with source code or from build arg
ARG DATABASE_URL
RUN if [ -n "$DATABASE_URL" ]; then \
      echo "Running prisma db push with provided DATABASE_URL..." && \
      DATABASE_URL="$DATABASE_URL" npx prisma db push --skip-generate --accept-data-loss || echo "⚠️ prisma db push failed (DB may not be reachable during build), will retry at runtime"; \
    elif [ -f .env ]; then \
      echo "Running prisma db push with .env file..." && \
      npx prisma db push --skip-generate --accept-data-loss || echo "⚠️ prisma db push failed, will retry at runtime"; \
    else \
      echo "⚠️ No DATABASE_URL available, skipping db push"; \
    fi

# Build the Next.js production bundle
RUN npm run build

# --- PRODUCTION RUNTIME ---
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies (OpenSSL is required for Prisma)
RUN apk add --no-cache openssl

# Copy node_modules and built files from builder
COPY --from=builder /app/Backend /app/Backend
COPY --from=builder /app/Frontend /app/Frontend

# Set working directory to Frontend
WORKDIR /app/Frontend

# Expose Next.js port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Start command
# Boot Next.js in production mode.
CMD ["sh", "-c", "npm run start"]

