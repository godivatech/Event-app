# CEDOI Digital Event Ticketing Platform — Operations & Runbook

## 1. System Requirements & Prerequisites
- **Node.js:** v20.x or higher
- **Package Manager:** npm v10.x or higher (Workspaces enabled)
- **Database:** PostgreSQL 16+ (tested on PostgreSQL 18.x locally)
- **Background Queue:** Redis 7+ (with automatic PostgreSQL Transactional Outbox fallback)
- **Operating Systems:** Windows 10/11, macOS, Ubuntu/Debian Linux

---

## 2. Local Setup & Startup Guide

### 2.1 Workspace Installation
```bash
# Clone the repository and install all monorepo dependencies
npm install

# Compile shared contract schemas and UI primitives
npm run build:packages
```

### 2.2 Environment Configuration
Copy the sample environment file to `.env`:
```bash
cp .env.example .env
```
Ensure your PostgreSQL database connection URL is accurate:
```env
DATABASE_URL="postgresql://postgres:Postgres%40123@127.0.0.1:5432/cedoi_event_db?schema=public"
```

### 2.3 Database Migration & Seeding
```bash
# Generate Prisma Client
npm run db:generate

# Push schema directly to PostgreSQL
npm run db:push

# Execute development seeds (Event, Ticket Types, Gates, Staff Accounts, Sample Booking)
npm run db:seed
```

### 2.4 Running Services Concurrently
```bash
# Terminal 1: Run NestJS API & Outbox Worker (Port 4000)
npm run dev:api

# Terminal 2: Run Next.js Web Application (Port 3000)
npm run dev:web
```

---

## 3. Pre-Configured Seed Credentials

| Role | Email Address | Password | Permissions Scope |
| :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | `superadmin@cedoi.org` | `Admin@123456` | Full organization, events, staff, refunds, reports |
| **ADMIN** | `admin@cedoi.org` | `Admin@123456` | Event operations, bookings, refunds, reports |
| **SCANNER** | `scanner@cedoi.org` | `Admin@123456` | Gate admission scanning & terminal history only |
| **Customer Pass** | Booking: `BK-20261025-SEED01` | Recovery: `CEDOI-DEMO-2026-PASS` | Guest ticket access & PDF download |

---

## 4. Docker Deployment Guide

To deploy the entire production stack using Docker Compose:
```bash
# Launch PostgreSQL, Redis, NestJS API, Background Worker, and Next.js Web
docker compose up -d --build

# Run migrations and seed data in the containerized database
docker compose exec api npx prisma db push
docker compose exec api npx ts-node prisma/seed.ts

# Inspect container status
docker compose ps
```

---

## 5. Automated Verification & Testing

Run the full automated test suite covering inventory concurrency, financial calculations, cryptographic tokens, and check-in guarantees:
```bash
# Run NestJS API integration and concurrency tests
npm --workspace=apps/api run test

# Run full monorepo typecheck and Next.js production build
npm run build
```

---

## 6. Backup & Restore Procedures

### 6.1 PostgreSQL Relational Database Backup
```bash
# Generate compressed binary dump
pg_dump -U postgres -h 127.0.0.1 -d cedoi_event_db -Fc -f "cedoi_backup_$(date +%Y%m%d_%H%M%S).dump"

# Restore database from backup
pg_restore -U postgres -h 127.0.0.1 -d cedoi_event_db -c "cedoi_backup_YYYYMMDD_HHMMSS.dump"
```

### 6.2 Ticket Encryption Key (`TICKET_ENCRYPTION_KEY`)
- The 256-bit AES-256-GCM encryption key (`TICKET_ENCRYPTION_KEY`) must be stored in a secure secret manager (e.g. AWS Secrets Manager, HashiCorp Vault).
- **CAUTION:** Rotating the key requires a phased re-encryption migration of the `Ticket.qrTokenEncrypted` column. Never delete or overwrite the active encryption key in production without running the key rotation script.

### 6.3 PDF Artifacts
All generated PDFs are stored in `PDF_STORAGE_DIR` (`./storage/pdfs` or container volume). In the event of disk loss, PDFs can be regenerated idempotently at any time from the authoritative `Ticket` records using `POST /api/v1/tickets/:bookingNumber/pdf/regenerate`.

---

## 7. Incident Runbook & Troubleshooting

### Problem: Customer browser closed during Cashfree payment
- **Resolution:** The backend handles this automatically. When Cashfree confirms the capture via webhook (`PAYMENT_SUCCESS_WEBHOOK`), the backend fulfills the booking and provisions individual tickets. The customer can visit `/recover` on any device using their booking number and recovery code to access their passes.

### Problem: Stale temporary reservations holding inventory
- **Resolution:** The `OutboxService` sweeper runs every 5 seconds and automatically marks expired reservations as `EXPIRED`, restoring held ticket quantities back to the available pool.

### Problem: Staff mobile scanner camera unavailable
- **Resolution:** 
  1. Verify the site is loaded over HTTPS or `localhost` (browsers block `getUserMedia` on unencrypted HTTP).
  2. If the user denied camera permission, click the **Manual Ticket Lookup** button on the scanner interface to enter the 12-character ticket number manually.

### Problem: Redis service failure or restart
- **Resolution:** The platform utilizes the PostgreSQL Transactional Outbox pattern as a durable source of truth. If Redis crashes, no jobs are lost. The backend continues executing PDF generation and expiry jobs directly from the database outbox queue.
