# ── Stage 1: Build ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Production runtime ──────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy Prisma client and compiled output
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

EXPOSE 4000

# Apply any pending migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
