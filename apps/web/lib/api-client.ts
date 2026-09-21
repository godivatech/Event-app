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

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
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

  // Attach token from localStorage if present in browser
  if (!isServer) {
    try {
      const storedToken = localStorage.getItem('cedoi_staff_token');
      if (storedToken) {
        defaultHeaders['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch {
      // Ignore localStorage access issues in restricted browser sandboxes
    }
  }

  const response = await fetch(url, {
    ...options,
    credentials: options.credentials || 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

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
        message: 'The API server is currently initializing or unreachable. Please verify that port 4000 is running and retry.',
      });
    }
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: `HTTP Error ${response.status}: Unable to parse server response.`,
    });
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
