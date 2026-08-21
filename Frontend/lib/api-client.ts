import { ApiResponse } from './types';

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly captchaId?: string;
  public readonly captchaSvg?: string;
  public readonly delayMs?: number;

  constructor(message: string, statusCode: number, errorData?: Record<string, any>) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = errorData?.code;
    this.details = errorData?.details;
    this.captchaId = errorData?.captchaId;
    this.captchaSvg = errorData?.captchaSvg;
    this.delayMs = errorData?.delayMs;
  }
}

export interface RequestOptions extends RequestInit {
  token?: string | null;
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  }

  public setToken(token: string | null): void {
    this.authToken = token;
  }

  public getToken(): string | null {
    return this.authToken;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  public async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { token, params, headers = {}, ...customConfig } = options;
    const url = this.buildUrl(path, params);

    const activeToken = token !== undefined ? token : this.authToken;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(headers as Record<string, string>)
    };

    if (activeToken) {
      requestHeaders['Authorization'] = `Bearer ${activeToken}`;
    }

    const config: RequestInit = {
      ...customConfig,
      headers: requestHeaders
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 204) {
        return {} as T;
      }

      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      if (!response.ok) {
        const errorMessage = data?.error?.message || data?.message || `Request failed with status ${response.status}`;
        throw new ApiClientError(errorMessage, response.status, data?.error || data);
      }

      // If backend uses standard envelope { success: true, data: T }
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        return data.data as T;
      }

      return data as T;
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        throw err;
      }
      throw new ApiClientError(
        err.message || 'Network connection failed',
        0,
        { details: err }
      );
    }
  }

  public get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  public patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  public delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  public async downloadBlob(path: string, options?: RequestOptions): Promise<{ blob: Blob; filename: string }> {
    const { token, params, headers = {}, ...customConfig } = options || {};
    const url = this.buildUrl(path, params);
    const activeToken = token !== undefined ? token : this.authToken;

    const requestHeaders: Record<string, string> = {
      ...(headers as Record<string, string>)
    };

    if (activeToken) {
      requestHeaders['Authorization'] = `Bearer ${activeToken}`;
    }

    const response = await fetch(url, {
      ...customConfig,
      method: 'GET',
      headers: requestHeaders
    });

    if (!response.ok) {
      throw new ApiClientError(`Download failed with status ${response.status}`, response.status);
    }

    const disposition = response.headers.get('content-disposition');
    let filename = 'export';
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blob = await response.blob();
    return { blob, filename };
  }
}

export const apiClient = new ApiClient();
