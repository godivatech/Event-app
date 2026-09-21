# CEDOI Digital Event Ticketing Platform — Architecture Specification

## 1. System Overview & Monolith Structure
The CEDOI Digital Event Ticketing Platform is built as a hardened **modular monolith** architected to scale reliably from initial 2,000 admissions up to high-volume events. It features three distinct user experiences driven by a shared design language and centralized state invariants:
1. **Customer Web Portal (`apps/web`):** Next.js 14 (App Router) rendering server-side SEO-optimized event landing pages, dynamic multi-tier ticket reservation countdowns, Razorpay Checkout integration, instant QR admission passes, and signed PDF downloads.
2. **Admin Command Center (`apps/web/app/admin`):** High-density managerial dashboard providing authoritative PostgreSQL aggregations for gross/net revenue, category allocation, gate throughput velocity, booking inspections, Excel-compatible CSV exports, and voluntary refund executions.
3. **Gate Scanner Terminal (`apps/web/app/scanner`):** Mobile-optimized, HTTPS-enforced barcode scanning interface utilizing `getUserMedia` and Native `BarcodeDetector` (with manual fallback), backed by single-entry atomic check-in transactions and request-ID idempotency.

---

## 2. Monorepo Organization
```
├── apps/
│   ├── api/                 # NestJS REST API & Background Job Outbox Worker
│   │   ├── prisma/          # PostgreSQL Prisma Schema, Versioned Migrations & Seeds
│   │   ├── src/
│   │   │   ├── common/      # Guards, Decorators, Crypto Utilities (AES-256-GCM / SHA-256)
│   │   │   ├── modules/     # Auth, Events, Inventory, Bookings, Payments, Tickets, Check-ins, Reports
│   │   │   ├── main.ts      # HTTP REST Server Entrypoint (:4000)
│   │   │   └── worker.ts    # Background Outbox & Job Worker Entrypoint
│   │   └── test/            # Integration & Concurrency Test Suites (14 Tests passing)
│   └── web/                 # Next.js 14 Frontend Application (:3000)
│       ├── app/             # App Router (/events, /booking, /admin, /scanner, /recover, /help)
│       ├── components/      # Feature compositions
│       └── lib/             # Shared API client and utility helpers
├── packages/
│   ├── contracts/           # Zero-dependency TypeScript DTOs, Enums, and Response Envelopes
│   └── ui/                  # CEDOI Design System Tokens & Accessible React Primitives
└── docs/                    # Architectural Specifications, State Transitions & Operations
```

---

## 3. Data & Concurrency Model

### 3.1 Currency & Precision
All monetary calculations are performed strictly in integer **paise** (`Int` in Prisma/PostgreSQL). Decimal and floating-point arithmetic is prohibited to prevent rounding drift. Display values are converted to rupees on output using `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.

### 3.2 Pessimistic Inventory Locking
To prevent overselling and race conditions when multiple users compete for the final tickets:
1. Reservation mutations lock rows in PostgreSQL using `SELECT ... FOR UPDATE` within a transaction.
2. Mixed-category bookings sort `ticketTypeId` deterministically in ascending order before acquiring locks to guarantee deadlock-free concurrency.
3. If any category in a multi-item selection has insufficient capacity, the entire transaction rolls back atomically without partial allocations.
4. Active holds expire after a server-enforced duration (default: 10 minutes). Repeated sweeps are strictly idempotent.

### 3.3 Atomic Single-Entry Admission Check-In
Gate check-in ensures that possessing a QR pass allows exactly one physical entry:
```sql
UPDATE "Ticket"
SET status = 'USED', "updatedAt" = NOW()
WHERE id = $ticketId AND status = 'ACTIVE';
```
If the affected row count is 0, the transaction queries previous check-ins and returns `ALREADY_USED` with the timestamp and gate of the original admission.
- **Client Request ID Idempotency:** Mobile scanner requests provide a client-generated UUID `requestId`. If a network glitch occurs after admission, retrying with the same `requestId` returns the original `SUCCESS` outcome without duplicating admission counts.

---

## 4. Cryptographic Security & Credential Lifecycle

### 4.1 Ticket QR Tokens
- Each ticket is provisioned with a cryptographically secure random token generated with **256 bits of entropy** (`crypto.randomBytes(32).toString('hex')`).
- Tokens contain zero PII, customer names, sequential database IDs, or admin credentials.
- **At-Rest Protection:** The raw token is encrypted using **AES-256-GCM** with a 12-byte initialization vector (IV) and 16-byte authentication tag prior to database persistence.
- **Deterministic Lookup:** A SHA-256 hash of the raw token (`qrTokenHash`) is indexed in PostgreSQL for instantaneous O(1) scanner lookups without exposing or decrypting credentials across the table.

### 4.2 Customer Booking Recovery
Guest checkout creates an unguessable 128-bit recovery code (e.g., `CEDOI-XXXX-XXXX-XXXX`) presented once during checkout:
- Only the SHA-256 hash (`recoveryCodeHash`) is stored.
- Booking recovery requires both the exact public `bookingNumber` and raw recovery code.
- Failed attempts are rate-limited with exponential backoff and uniform generic error messages to eliminate brute-force vulnerability.

---

## 5. Payment Lifecycle & Reconciliation

```
[Customer Checkout] 
       │
       ▼
Create Server Reservation ────► Razorpay Order Creation (paise accurate)
       │                                     │
       ▼                                     ▼
Hold Active (10 Mins)               Checkout Window (Client Modal)
       │                                     │
       ├─────────────────────────────────────┤
       ▼                                     ▼
Browser Callback (verify)           Durable Webhook (HMAC SHA-256)
       │                                     │
       └───────────────┬─────────────────────┘
                       ▼
          Authoritative Fulfillment
           (Atomic PostgreSQL Tx)
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
[Capacity Available]         [Late Capture / Sold Out]
• Status -> CONFIRMED        • Status -> PAYMENT_EXCEPTION
• Hold -> CONSUMED           • Outbox -> Automatic Compensating Refund
• Provision Tickets          • Alert Admin Dashboard
• Enqueue PDF Outbox Job
```

### 5.1 Multi-Path Convergence
Payment fulfillment converges via `PaymentsService.fulfillCapturedPayment`:
- Verified Checkout callbacks, durable webhooks (`payment.captured`), and background reconciliation jobs share the same atomic fulfillment logic.
- Incoming webhook event IDs (`evt_id`) are deduplicated through the `ProcessedWebhook` database table.
- A booking is fulfilled exactly once; redundant captures trigger automatic compensating refunds without overselling capacity.

### 5.2 Transactional Outbox Pattern
Background tasks (PDF generation, reservation expiry sweeps, refund settlement) are committed to the `OutboxJob` table in the same database transaction as the business event. A dedicated sweeper polls pending jobs, dispatching them to Redis/BullMQ or executing them directly via the PostgreSQL fallback worker.
