import { isAxiosError } from 'axios';

export function isUnauthorizedProfileError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  const path = error.config?.url?.split('?')[0].replace(/\/+$/, '');
  const refreshRejectedWithoutCookie =
    path?.endsWith('/auth/refresh') === true && status === 400;

  return status === 401 || refreshRejectedWithoutCookie;
}

export function shouldRetryProfileQuery(failureCount: number, error: unknown): boolean {
  return !isUnauthorizedProfileError(error) && failureCount < 2;
}
