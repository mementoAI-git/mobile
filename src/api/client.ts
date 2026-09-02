import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { API_BASE_URL } from '@/lib/env';
import type { ApiError, RequestOptions } from './interface';
import type { IAuth } from '@/types';
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
      skipErrorHandling?: boolean;
      _retry?: boolean;
    };

    // Auto-refresh on 401
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        const { authService } = await import('./auth-service');
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

    const apiError = normalizeApiError(
      error.response?.data,
      error.response?.status,
      error.message || 'An error occurred',
    );

    return Promise.reject(apiError);
  },
);

export default client;
