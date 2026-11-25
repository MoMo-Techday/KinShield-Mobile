import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from './api-error';

function axiosErrorWithMessage(message: string | string[]) {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  const response: AxiosResponse = {
    data: { message },
    status: 400,
    statusText: 'Bad Request',
    headers: new AxiosHeaders(),
    config,
  };

  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response);
}

describe('getApiErrorMessage', () => {
  it('returns a Nest string message', () => {
    expect(getApiErrorMessage(axiosErrorWithMessage('Email không hợp lệ'))).toBe(
      'Email không hợp lệ',
    );
  });

  it('joins a Nest validation message array', () => {
    expect(getApiErrorMessage(axiosErrorWithMessage(['Email không hợp lệ', 'Mật khẩu quá ngắn']))).toBe(
      'Email không hợp lệ. Mật khẩu quá ngắn',
    );
  });

  it('returns a useful non-Axios error message', () => {
    expect(getApiErrorMessage(new Error('Unexpected failure'))).toBe('Unexpected failure');
  });

  it('returns a Vietnamese connection message for a network error', () => {
    expect(getApiErrorMessage(new AxiosError('Network Error'))).toBe(
      'Không thể kết nối đến máy chủ. Vui lòng thử lại.',
    );
  });
});
