# Multi-stage Dockerfile for NestJS API & Worker
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci

# Copy contracts source and compile
COPY packages/contracts ./packages/contracts
RUN npm --workspace=packages/contracts run build

# Copy UI source and compile
COPY packages/ui ./packages/ui
RUN npm --workspace=packages/ui run build

# Copy API source and Prisma schema
COPY apps/api ./apps/api
RUN cd apps/api && npx prisma generate
RUN npm --workspace=apps/api run build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/contracts/dist ./packages/contracts/dist
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

RUN npm ci --omit=dev

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/main.js"]
