import { isAxiosError } from 'axios';

type ApiErrorResponse = {
  message?: unknown;
};

const connectionErrorMessage = 'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
const genericErrorMessage = 'Đã xảy ra lỗi. Vui lòng thử lại.';

export function getApiErrorMessage(error: unknown): string {
  if (!isAxiosError<ApiErrorResponse>(error)) {
    return error instanceof Error && error.message ? error.message : genericErrorMessage;
  }

  if (!error.response) {
    return connectionErrorMessage;
  }

  const message = error.response.data?.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (Array.isArray(message)) {
    const messages = message.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
    if (messages.length > 0) {
      return messages.join('. ');
    }
  }

  return genericErrorMessage;
}
