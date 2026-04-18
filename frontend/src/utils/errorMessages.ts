/**
 * Utilities for surfacing user-facing error messages from the different error
 * shapes that flow through the app.
 *
 * The API layer (ApiBase in `services/ApiService`) normalizes thrown errors
 * into `{ detail: string, status: number }`, but not every call path goes
 * through that facade. Raw axios errors expose the backend detail at
 * `err.response.data.detail`, and plain `Error` instances only have
 * `err.message`. Standardizing extraction avoids subtle bugs when a caller
 * forgets one of the shapes and ends up showing "[object Object]" or the
 * generic fallback even though the backend returned a clear message.
 */

type ErrorLike = {
  detail?: unknown;
  message?: unknown;
  response?: { data?: { detail?: unknown; message?: unknown } };
};

const firstNonEmptyString = (values: unknown[]): string | null => {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
};

/**
 * Returns the first meaningful error message found on `err`, falling back to
 * `fallback` when nothing is available. Candidates are checked in order of
 * specificity: the API-normalized `.detail`, then the raw axios
 * `.response.data.detail` / `.message`, then the plain Error `.message`.
 *
 * @example
 * ```ts
 * try { await apiService.patients.delete(id); }
 * catch (err) {
 *   toast.error(extractErrorMessage(err, 'No se pudo eliminar el paciente'));
 * }
 * ```
 */
export const extractErrorMessage = (
  err: unknown,
  fallback = 'Ocurrió un error inesperado'
): string => {
  if (err == null) return fallback;
  if (typeof err === 'string') {
    return err.trim() || fallback;
  }
  if (typeof err !== 'object') return fallback;

  const e = err as ErrorLike;
  const message = firstNonEmptyString([
    e.detail,
    e.response?.data?.detail,
    e.response?.data?.message,
    e.message
  ]);
  return message ?? fallback;
};

/**
 * Shape returned by `extractErrorInfo` — convenient when the caller needs the
 * HTTP status alongside the message (e.g. to distinguish 401 from 500 to pick
 * a recovery action).
 */
export interface ExtractedError {
  message: string;
  status: number | null;
  isNetworkError: boolean;
}

/**
 * Variant of `extractErrorMessage` that also surfaces the HTTP status and a
 * best-effort flag for pure network failures (no response at all). Prefer this
 * when the UI should react differently to different statuses.
 */
export const extractErrorInfo = (
  err: unknown,
  fallback = 'Ocurrió un error inesperado'
): ExtractedError => {
  const message = extractErrorMessage(err, fallback);
  if (!err || typeof err !== 'object') {
    return { message, status: null, isNetworkError: false };
  }
  const e = err as { status?: unknown; response?: { status?: unknown } };
  const rawStatus =
    typeof e.status === 'number' ? e.status :
    typeof e.response?.status === 'number' ? e.response.status :
    null;
  // A request that never reached the server has no .response and no .status.
  const isNetworkError = rawStatus === null && (err as ErrorLike).response === undefined;
  return { message, status: rawStatus, isNetworkError };
};
