import { ApiResponse, ApiErrorDetail } from '@cedoi/contracts';

export class ApiError extends Error {
  code: string;
  requestId?: string;
  details?: unknown;

  constructor(errorDetail: ApiErrorDetail) {
    super(errorDetail.message);
    this.name = 'ApiError';
    this.code = errorDetail.code;
    this.requestId = errorDetail.requestId;
    this.details = errorDetail.details;
  }
}

export interface ApiClientOptions extends RequestInit {
  timeoutMs?: number;
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const isServer = typeof window === 'undefined';
  const baseUrl = isServer
    ? (process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000')
    : '';

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Attach token from localStorage if present in browser (route-namespaced)
  if (!isServer) {
    try {
      const currentPath = window.location.pathname || '';
      let storedToken: string | null = null;
      if (currentPath.startsWith('/scanner')) {
        storedToken = localStorage.getItem('cedoi_scanner_token') || localStorage.getItem('cedoi_staff_token');
      } else if (currentPath.startsWith('/admin')) {
        storedToken = localStorage.getItem('cedoi_admin_token') || localStorage.getItem('cedoi_staff_token');
      } else {
        storedToken =
          localStorage.getItem('cedoi_admin_token') ||
          localStorage.getItem('cedoi_scanner_token') ||
          localStorage.getItem('cedoi_staff_token');
      }

      if (storedToken) {
        defaultHeaders['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch {
      // Ignore localStorage access issues in restricted browser sandboxes
    }
  }

  // Setup abort controller for robust timeout protection (15 seconds default)
  const timeoutMs = options.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
      credentials: options.credentials || 'include',
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });
  } catch (err: any) {
    clearTimeout(timeoutTimer);
    if (err.name === 'AbortError') {
      throw new ApiError({
        code: 'REQUEST_TIMEOUT',
        message: 'The server took too long to respond (timeout after 15s). Please check your connection and retry.',
      });
    }
    throw new ApiError({
      code: 'NETWORK_FAILURE',
      message: err?.message || 'Network failure communicating with server.',
    });
  } finally {
    clearTimeout(timeoutTimer);
  }

  // If returning raw streaming data (e.g. PDF blob or CSV text), handle directly
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/pdf') || contentType.includes('text/csv')) {
    if (!response.ok) {
      throw new Error(`Failed to download resource (${response.status})`);
    }
    return response as unknown as T;
  }

  let data: ApiResponse<T>;
  try {
    data = await response.json();
  } catch (err) {
    if (response.status >= 500) {
      throw new ApiError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'The API server is currently initializing or unreachable. Please verify server status and retry.',
      });
    }
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: `HTTP Error ${response.status}: Unable to parse server response.`,
    });
  }

  // Centralized 401 Unauthorized handling
  if (response.status === 401 || (data as any)?.error?.code === 'UNAUTHENTICATED') {
    if (!isServer) {
      const currentPath = window.location.pathname || '';
      try {
        if (currentPath.startsWith('/admin')) {
          localStorage.removeItem('cedoi_admin_token');
          localStorage.removeItem('cedoi_staff_token');
        } else if (currentPath.startsWith('/scanner')) {
          localStorage.removeItem('cedoi_scanner_token');
          localStorage.removeItem('cedoi_staff_token');
        } else {
          localStorage.removeItem('cedoi_admin_token');
          localStorage.removeItem('cedoi_scanner_token');
          localStorage.removeItem('cedoi_staff_token');
        }
      } catch {}

      // Auto-redirect if on protected routes and not on login page
      if (currentPath.startsWith('/admin') && !currentPath.startsWith('/admin/login')) {
        window.location.replace('/admin/login');
      } else if (currentPath.startsWith('/scanner') && !currentPath.startsWith('/scanner/login')) {
        window.location.replace('/scanner/login');
      }
    }
  }

  if (!response.ok || !data.success) {
    const errDetail: ApiErrorDetail = (data as any).error || {
      code: 'UNKNOWN_ERROR',
      message: 'An error occurred while processing your request.',
    };
    throw new ApiError(errDetail);
  }

  return (data as any).data;
}
