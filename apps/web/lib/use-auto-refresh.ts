'use client';

import { useEffect, useRef } from 'react';

/**
 * Dispatches cross-component and cross-tab notifications when data changes
 * (e.g., booking deleted, booking marked paid, refund settled, ticket scanned).
 */
export function notifyDataUpdated(topic: string = 'general') {
  if (typeof window === 'undefined') return;
  try {
    // 1. In-tab custom DOM event
    window.dispatchEvent(
      new CustomEvent('cedoi:data-updated', {
        detail: { topic, timestamp: Date.now() },
      })
    );

    // 2. Cross-tab BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('cedoi-events');
      bc.postMessage({ type: 'DATA_UPDATED', topic, timestamp: Date.now() });
      bc.close();
    }
  } catch (err) {
    // Silently ignore storage/broadcast errors in sandbox environments
  }
}

interface UseAutoRefreshOptions {
  intervalMs?: number;
  enabled?: boolean;
}

/**
 * Automatically triggers callback on:
 * 1. Data update events (from current tab or other tabs via BroadcastChannel)
 * 2. Window focus & tab visibility changes (when returning to the page)
 * 3. Smooth periodic polling interval while the tab is active
 */
export function useAutoRefresh(
  callback: () => void | Promise<void>,
  options: UseAutoRefreshOptions = {}
) {
  const { intervalMs = 20000, enabled = true } = options;
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // 1. Handle in-tab data change events
    const handleLocalUpdate = () => {
      try {
        cbRef.current();
      } catch (err) {
        console.error('AutoRefresh local update error:', err);
      }
    };
    window.addEventListener('cedoi:data-updated', handleLocalUpdate);

    // 2. Handle cross-tab BroadcastChannel events
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('cedoi-events');
        bc.onmessage = (event) => {
          if (event.data?.type === 'DATA_UPDATED') {
            cbRef.current();
          }
        };
      } catch {
        // Fallback gracefully if BroadcastChannel is blocked
      }
    }

    // 3. Handle tab visibility & window focus (re-sync on tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        cbRef.current();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // 4. Smooth periodic timer while tab is in view
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        cbRef.current();
      }
    }, intervalMs);

    return () => {
      window.removeEventListener('cedoi:data-updated', handleLocalUpdate);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
      clearInterval(timer);
    };
  }, [enabled, intervalMs]);
}
