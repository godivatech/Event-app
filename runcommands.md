# How to Run CEDOI Event Application

Follow these steps to run the application locally on your machine.

---

## 🚀 Quick Start (Two Terminals)

Open two separate terminal windows in the project root directory (`g:\Godivatech\Event application`):

### Terminal 1: Backend API Server (Port 4000)
```powershell
npm run dev:api
```
- **Local API URL**: `http://localhost:4000`
- **Swagger / API Prefix**: `http://localhost:4000/api/v1`

---

### Terminal 2: Frontend Web App (Port 3000)
```powershell
npm run dev:web
```
*(Or alternatively: `npm --workspace=apps/web run dev`)*
- **Public Homepage**: `http://localhost:3000`
- **Ticket Booking**: `http://localhost:3000/events/cedoi-awards-2026/tickets`
- **Staff Gate Scanner**: `http://localhost:3000/scanner/login`
- **Admin Dashboard**: `http://localhost:3000/admin/login`

---

## 🔑 Default Login Credentials

| Portal | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Admin Portal** (`/admin/login`) | `superadmin@cedoi.org` | `Admin@123456` | Super Administrator |
| **Gate Scanner** (`/scanner/login`) | `scanner@cedoi.org` | `Admin@123456` | Gate Check-in Staff |

---

## 🛠️ Helpful Maintenance Commands

### Re-seed Database (Reset or Refresh Events & Tickets)
```powershell
npm run prisma:seed
```

### Re-generate Prisma Client (After Schema Changes)
```powershell
npm run prisma:generate
```

### Build & Verify Production Bundle
```powershell
npm run build
```

---

## 💳 Payment Gateway Configuration (Cashfree)

The application uses **Cashfree Payments** as the primary payment gateway.

In `apps/api/.env`:
```env
CASHFREE_APP_ID="your_cashfree_app_id"
CASHFREE_SECRET_KEY="your_cashfree_secret_key"
CASHFREE_ENV="SANDBOX" # Or "PRODUCTION"
CASHFREE_API_VERSION="2023-08-01"
```
> **Note:** If Cashfree credentials are empty or set to test mode, the application seamlessly provides an instant **Test-Mode Dev Simulation** on the checkout page so you can test complete end-to-end QR pass generation and PDF issuance offline.

---

## 🌐 Production URLs (Deployed)
- **Live Frontend**: `https://event-app-web-ten.vercel.app/`
- **Live Backend**: `https://event-api-mlna.onrender.com/`

