/**
 * Centralized formatting utilities for CEDOI Platform
 * Enforces single source of truth for currency and datetime across all interfaces.
 */

/**
 * Formats integer paise into clean Indian Rupee string (e.g., 50000 -> ₹500)
 */
export function formatPaise(paise: number | undefined | null): string {
  if (paise === undefined || paise === null || isNaN(paise)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

/**
 * Formats an ISO date string into standard readable date (e.g., 25 Oct 2026)
 */
export function formatDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats an ISO date string into readable date and time (e.g., 25 Oct 2026, 09:30 am)
 */
export function formatDateTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculates a safe integer percentage
 */
export function calculatePercentage(partial: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((partial / total) * 100)));
}
