import type { AxiosRequestConfig } from 'axios';

export interface IResponse<T = unknown> {
  message: string;
  success?: boolean;
  data?: T;
  status?: number;
  meta?: {
    contract_version?: string;
    request_id?: string;
    deprecations?: string[];
  };
}

export interface ApiError {
  message: string;
  status?: number;
  httpStatus?: number;
  success?: false;
  code?: string;
  details?: Record<string, unknown>;
  request_id?: string;
  errors?: unknown;
  data?: unknown;
}

export interface RequestOptions extends AxiosRequestConfig {
  skipAuth?: boolean;
  skipErrorHandling?: boolean;
}

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status?: number;
  success?: boolean;
  meta?: IResponse['meta'];
}
