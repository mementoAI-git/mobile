import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { API_BASE_URL } from '@/lib/env';
import type { ApiError } from './interface';
import { normalizeApiError } from './contract-adapter';
import { getMementoClientHeaders } from './client-runtime-metadata';

import { useAuthStore } from '@/store/auth.store';

const getAuthToken = (): string | null => {
  return useAuthStore.getState().token?.access_token ?? null;
};

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...getMementoClientHeaders(),
  },
});

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const requestConfig = config as InternalAxiosRequestConfig & { skipAuth?: boolean };
    if (!requestConfig.skipAuth) {
      const token = getAuthToken();
      if (token) {
        config.headers.authorization = `Bearer ${token}`;
      } else {
        return Promise.reject(
          normalizeApiError(null, 401, 'Authentication token required'),
        );
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      skipAuth?: boolean;
      skipErrorHandling?: boolean;
      _retry?: boolean;
    };

    // Auto-refresh on 401 for authenticated calls only. Login/register 401s
    // must not attempt a refresh or terminate an existing session.
    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !originalRequest?.skipAuth
    ) {
      originalRequest._retry = true;
      try {
        const { authService } = await import('./auth-service');
        const authData = await authService.getAuthData();
        if (!authData?.access_token) {
          throw new Error('No authentication data found');
        }
        const newAuth = await authService.refreshAccessToken();
        originalRequest.headers.authorization = `Bearer ${newAuth.access_token}`;
        return client(originalRequest);
      } catch (refreshError) {
        const { terminateSession } = await import('@/features/auth/session-coordinator');
        await terminateSession('expired');
        const refreshResponse = (refreshError as AxiosError<ApiError>)?.response;
        return Promise.reject(
          normalizeApiError(
            refreshResponse?.data,
            refreshResponse?.status,
            (refreshError as Error)?.message || 'Session expired',
          ),
        );
      }
    }

    const rawStatus = (error as any)?.status ?? (error as any)?.httpStatus ?? error.response?.status;
    const apiError = normalizeApiError(
      error.response?.data ?? (error as any)?.data,
      rawStatus,
      error.message || 'An error occurred',
    );

    return Promise.reject(apiError);
  },
);

export default client;
