/**
 * Functional Result<T, E> container for domain and application operations.
 */
export type Result<T, E = Error> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function fail<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { readonly success: true; readonly data: T } {
  return result.success;
}

export function isFail<T, E>(result: Result<T, E>): result is { readonly success: false; readonly error: E } {
  return !result.success;
}
