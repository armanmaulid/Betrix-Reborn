/**
 * Shared Infrastructure HTTP Client
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface HttpRequestOptions extends RequestInit {
  queryParams?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiFetch<T = any>(path: string, init?: HttpRequestOptions): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let finalPath = path;
  if (init?.queryParams) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(init.queryParams)) {
      if (v !== undefined && v !== null && v !== '') {
        sp.set(k, String(v));
      }
    }
    const qs = sp.toString();
    if (qs) {
      finalPath = `${path}${path.includes('?') ? '&' : '?'}${qs}`;
    }
  }

  const res = await fetch(finalPath, {
    ...init,
    headers
  });

  if (res.status === 204) {
    return {} as T;
  }

  let data: unknown;
  if (typeof res.json === 'function') {
    try {
      data = await res.json();
    } catch {
      // Non-JSON response — preserve the raw text for error reporting
      // instead of silently converting to empty object
      const text = typeof res.text === 'function' ? await res.text().catch(() => '') : '';
      data = text || {};
    }
  } else if (typeof res.text === 'function') {
    const text = await res.text().catch(() => '');
    data = text || {};
  } else {
    data = {};
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    const record = data as Record<string, unknown> | string;
    if (typeof record === 'object' && record !== null) {
      const err = (record as { error?: { message?: unknown }; message?: unknown });
      message =
        (typeof err?.error?.message === 'string' && err.error.message) ||
        (typeof err?.message === 'string' && err.message) ||
        message;
    } else if (typeof data === 'string' && data.trim().length > 0) {
      message = data;
    }
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

/**
 * Unwrap a single-item API response: `res.data ?? res`
 */
export function unwrapData<T>(res: unknown): T {
  return ((res as { data?: unknown })?.data ?? res) as T;
}

/**
 * Unwrap a list API response, falling back to empty array.
 * Eliminates the repeated `res.data ?? (Array.isArray(res) ? res : [])` pattern.
 */
export function unwrapListData<T>(res: unknown): T[] {
  const payload = (res as { data?: unknown })?.data;
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(res)) return res as T[];
  return [];
}

/**
 * Sanitize a backend JSON response to prevent leaking internal details
 * (hostname, port, stack traces, SQL errors, etc.) to the client.
 * Only the `error.message` field is preserved; all other fields are stripped.
 */
export function sanitizeBackendResponse(data: any, status: number): any {
  if (status >= 200 && status < 300) return data;
  const message = data?.error?.message || data?.message || 'Request failed';
  return { success: false, error: { message } };
}

export class HttpClient {
  public async get<T>(path: string, options?: HttpRequestOptions): Promise<T> {
    return apiFetch<T>(path, { ...options, method: 'GET' });
  }

  public async post<T>(path: string, body?: unknown, options?: HttpRequestOptions): Promise<T> {
    return apiFetch<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  public async patch<T>(path: string, body?: unknown, options?: HttpRequestOptions): Promise<T> {
    return apiFetch<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  public async delete<T>(path: string, options?: HttpRequestOptions): Promise<T> {
    return apiFetch<T>(path, { ...options, method: 'DELETE' });
  }
}
