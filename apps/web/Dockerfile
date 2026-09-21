# Multi-stage Dockerfile for Next.js Web App
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci

# Copy contracts and compile
COPY packages/contracts ./packages/contracts
RUN npm --workspace=packages/contracts run build

# Copy UI and compile
COPY packages/ui ./packages/ui
RUN npm --workspace=packages/ui run build

# Copy Web application
COPY apps/web ./apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm --workspace=apps/web run build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/contracts/dist ./packages/contracts/dist
COPY packages/ui/package.json ./packages/ui/
COPY packages/ui/dist ./packages/ui/dist
COPY apps/web/package.json ./apps/web/

RUN npm ci --omit=dev

COPY --from=builder /app/apps/web/.next /app/apps/web/.next
COPY --from=builder /app/apps/web/public /app/apps/web/public

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["npx", "next", "start", "-p", "3000"]
