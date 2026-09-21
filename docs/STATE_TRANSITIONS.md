# CEDOI Digital Event Ticketing Platform — State Transition Specifications

This document defines the authoritative state machines, allowed transitions, triggering conditions, and UI representations across all core domain entities.

---

## 1. Booking State Machine

| From State | Allowed Target State | Triggering Condition | Business Invariant |
| :--- | :--- | :--- | :--- |
| **`PENDING`** | `CONFIRMED` | Verified Razorpay capture callback or webhook. | Reservation consumed; individual tickets issued; PDF job enqueued. |
| **`PENDING`** | `EXPIRED` | Reservation timer passes without payment capture. | Inventory released to pool; payment attempts marked unfulfillable. |
| **`PENDING`** | `PAYMENT_EXCEPTION` | Captured payment received after inventory expired and sold out. | Capacity protected; no tickets issued; automatic full refund initiated. |
| **`CONFIRMED`** | `CANCELLATION_PENDING`| Admin voluntary refund initiated. | Tickets transitioned to `SUSPENDED` to prevent concurrent gate check-in. |
| **`CANCELLATION_PENDING`**| `CANCELLED` | Provider confirms successful refund processing. | Tickets transitioned to `CANCELLED`; capacity conditionally returned. |
| **`CANCELLATION_PENDING`**| `CONFIRMED` | Provider refund settlement failed. | Tickets reactivated from `SUSPENDED` to `ACTIVE`; admin alerted. |

*Terminal States:* `CANCELLED`, `EXPIRED`. Stale callbacks or webhooks cannot revive a `CANCELLED` or `EXPIRED` booking.

---

## 2. Inventory Reservation State Machine

| State | Description | Transition Actions |
| :--- | :--- | :--- |
| **`HELD`** | Initial state upon checkout start. Quantities temporarily locked against capacity. | Expiry timestamp set (`NOW() + 10 minutes`). |
| **`CONSUMED`** | Payment verified as captured before expiry. | Quantities permanently deducted; converted into committed ticket sales. |
| **`RELEASED`** | Customer cancels reservation explicitly from review screen. | Quantities restored to available pool immediately. |
| **`EXPIRED`** | Timer elapsed; sweeper releases hold. | Releases held quantity once. Idempotent check ensures no double releases. |

---

## 3. Payment Attempt State Machine

| State | Description | Provider Event Equivalent |
| :--- | :--- | :--- |
| **`CREATED`** | Order created on Razorpay (`order_xxx`). | `order.created` |
| **`PENDING`** | Customer opened Checkout modal. | Modal active in browser |
| **`AUTHORIZED`**| Payment authorized but not yet captured. | `payment.authorized` |
| **`CAPTURED`** | Funds transferred to merchant account. | `payment.captured` |
| **`FAILED`** | Card declined or transaction aborted. | `payment.failed` |

---

## 4. Ticket Lifecycle

| State | Scanner Check-In Action | PDF Download Availability |
| :--- | :--- | :--- |
| **`ACTIVE`** | **Permitted.** Transitioned atomically to `USED`. | Download allowed. |
| **`USED`** | **Rejected.** Returns `ALREADY_USED` with first check-in time/gate. | Download allowed (inspection only; cannot re-enter). |
| **`SUSPENDED`** | **Rejected.** Returns `SUSPENDED`. | Blocked. Booking is undergoing cancellation/refund review. |
| **`CANCELLED`** | **Rejected.** Returns `CANCELLED`. | Blocked. Refunded booking; invalid credential. |

---

## 5. Refund Lifecycle

| State | Description | Resolution |
| :--- | :--- | :--- |
| **`REQUESTED`** | Admin initiated refund or late-capture trigger created. | Assigned unique internal operation reference. |
| **`PROCESSING`**| Sent to Razorpay refund API (`/v1/payments/:id/refund`). | Awaiting webhook or polling status. |
| **`SUCCEEDED`** | Razorpay confirmed refund settlement. | Booking marked `CANCELLED`; tickets `CANCELLED`. |
| **`FAILED`** | Provider rejected refund (e.g. insufficient merchant balance). | Retains exception state; alerts admin console. |

---

## 6. UI Status Representation Mappings

| Domain State | Customer UI Display | Admin Dashboard Badge | Scanner Terminal Banner |
| :--- | :--- | :--- | :--- |
| **`CONFIRMED`** | Confirmed (Green) | `CONFIRMED` (Emerald) | Active for check-in |
| **`PENDING`** | Reserved (10m Countdown) | `PENDING` (Blue) | Not applicable |
| **`EXPIRED`** | Hold Expired (Warning) | `EXPIRED` (Slate) | Not applicable |
| **`CANCELLED`** | Booking Cancelled (Red) | `CANCELLED` (Red) | **CANCELLED** (Red reject) |
| **`PAYMENT_EXCEPTION`**| Payment Verifying / Refunding | `EXCEPTION` (Amber) | **INVALID** (Red reject) |
| **`USED`** | Admitted at Gate | `ADMITTED` (Cyan) | **ALREADY USED** (Amber reject) |
