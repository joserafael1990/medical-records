import { extractErrorMessage, extractErrorInfo } from '../errorMessages';

describe('extractErrorMessage', () => {
  it('returns the fallback when err is null or undefined', () => {
    expect(extractErrorMessage(null, 'fb')).toBe('fb');
    expect(extractErrorMessage(undefined, 'fb')).toBe('fb');
  });

  it('uses the default fallback when none is provided', () => {
    expect(extractErrorMessage(null)).toBe('Ocurrió un error inesperado');
  });

  it('returns a string error as-is', () => {
    expect(extractErrorMessage('Simple string error')).toBe('Simple string error');
  });

  it('falls back for empty or whitespace-only strings', () => {
    expect(extractErrorMessage('   ', 'fb')).toBe('fb');
    expect(extractErrorMessage('', 'fb')).toBe('fb');
  });

  it('prefers err.detail over other sources', () => {
    const err = {
      detail: 'from api-base',
      message: 'from js error',
      response: { data: { detail: 'from axios raw' } }
    };
    expect(extractErrorMessage(err)).toBe('from api-base');
  });

  it('falls back to response.data.detail when err.detail is absent', () => {
    const err = {
      message: 'from js error',
      response: { data: { detail: 'from axios raw' } }
    };
    expect(extractErrorMessage(err)).toBe('from axios raw');
  });

  it('falls back to err.message when nothing more specific is present', () => {
    const err = new Error('plain js error');
    expect(extractErrorMessage(err)).toBe('plain js error');
  });

  it('ignores non-string candidates', () => {
    const err = {
      // detail is an object (shouldn't happen but defensive)
      detail: { nested: 'bad shape' },
      message: 'fallback to me'
    };
    expect(extractErrorMessage(err)).toBe('fallback to me');
  });

  it('trims whitespace on the returned message', () => {
    const err = { detail: '  important message  ' };
    expect(extractErrorMessage(err)).toBe('important message');
  });

  it('returns the fallback for primitives other than string', () => {
    expect(extractErrorMessage(42, 'fb')).toBe('fb');
    expect(extractErrorMessage(true, 'fb')).toBe('fb');
  });
});

describe('extractErrorInfo', () => {
  it('surfaces the status from an ApiError-shaped object', () => {
    const err = { detail: 'Unauthorized', status: 401 };
    expect(extractErrorInfo(err)).toEqual({
      message: 'Unauthorized',
      status: 401,
      isNetworkError: false
    });
  });

  it('surfaces the status from a raw axios error', () => {
    const err = {
      response: { status: 500, data: { detail: 'Server error' } }
    };
    expect(extractErrorInfo(err)).toEqual({
      message: 'Server error',
      status: 500,
      isNetworkError: false
    });
  });

  it('flags a network error when there is no response at all', () => {
    // Network failures in axios surface as Error with .message but no .response
    const err = new Error('Network Error');
    const info = extractErrorInfo(err);
    expect(info.message).toBe('Network Error');
    expect(info.status).toBeNull();
    expect(info.isNetworkError).toBe(true);
  });

  it('does not flag a network error when there is a response but no status', () => {
    const err = { detail: 'weird', response: { data: {} } };
    expect(extractErrorInfo(err).isNetworkError).toBe(false);
  });
});
