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
# 1. Run Prisma DB push to ensure PostgreSQL schema is initialized.
# 2. Run the import script automatically if migration_data.json exists.
# 3. Boot Next.js in production mode.
CMD ["sh", "-c", "npx prisma db push && node db_import.js && npm run start"]
