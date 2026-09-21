/**
 * Formats monetary amounts stored in integer paise into INR currency string.
 * Example: 50000 paise -> ₹500
 */
export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

/**
 * Formats ISO date string into readable event date.
 */
export function formatEventDate(isoDate: string, timezone: string = 'Asia/Kolkata'): string {
  try {
    return new Date(isoDate).toLocaleDateString('en-IN', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

/**
 * Formats ISO date string into readable event time.
 */
export function formatEventTime(isoDate: string, timezone: string = 'Asia/Kolkata'): string {
  try {
    return new Date(isoDate).toLocaleTimeString('en-IN', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoDate;
  }
}
