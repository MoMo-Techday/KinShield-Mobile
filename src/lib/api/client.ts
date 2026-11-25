import {
  create,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { AccessToken } from '@/services/auth-service';
import { clearAccessToken, getAccessToken, saveAccessToken } from './token-storage';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean;
};

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const apiClient = create({
  baseURL: apiUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const refreshClient = create({
  baseURL: apiUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

function requiresAuthentication(config: InternalAxiosRequestConfig): boolean {
  const method = config.method?.toLowerCase();
  const path = config.url?.split('?')[0].replace(/^\/+/, '');

  return (
    (method === 'get' && path === 'auth/me') ||
    (method === 'post' && path === 'auth/password/change')
  );
}

let refreshInFlight: Promise<AccessToken> | null = null;

async function refreshAccessToken(): Promise<AccessToken> {
  if (!refreshInFlight) {
    refreshInFlight = refreshClient
      .post<AccessToken>('/auth/refresh')
      .then(async ({ data }) => {
        await saveAccessToken(data.accessToken, data.expiresIn);
        return data;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

apiClient.interceptors.request.use(async (config) => {
  if (!apiUrl?.trim()) {
    throw new Error('EXPO_PUBLIC_API_URL is required to make API requests.');
  }

  if (requiresAuthentication(config)) {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableRequestConfig | undefined;
    if (
      error.response?.status !== 401 ||
      !config ||
      config._authRetry ||
      !requiresAuthentication(config)
    ) {
      return Promise.reject(error);
    }

    config._authRetry = true;
    let session: AccessToken;
    try {
      session = await refreshAccessToken();
    } catch (refreshError) {
      await clearAccessToken();
      return Promise.reject(refreshError);
    }

    config.headers.Authorization = `Bearer ${session.accessToken}`;
    return apiClient(config);
  },
);

export { apiClient };
