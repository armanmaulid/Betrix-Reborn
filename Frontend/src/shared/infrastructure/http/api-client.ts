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
  timeoutMs?: number;
  retries?: number;
  queryParams?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiFetch<T = any>(
  path: string,
  init?: HttpRequestOptions
): Promise<T> {
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

  let data: any;
  if (typeof res.json === 'function') {
    try {
      data = await res.json();
    } catch {
      data = typeof res.text === 'function' ? await res.text().catch(() => ({})) : {};
    }
  } else if (typeof res.text === 'function') {
    data = await res.text().catch(() => ({}));
  } else {
    data = {};
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (typeof data === 'object' && data !== null) {
      message = (data as any)?.error?.message || (data as any)?.message || message;
    } else if (typeof data === 'string' && data.trim().length > 0) {
      message = data;
    }
    throw new ApiError(message, res.status, data);
  }

  return data as T;
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

export const httpClient = new HttpClient();
