import Axios from 'axios';
import dayjs from 'dayjs';
import { secureStorage } from '@/lib/secure-storage';
import { API_BASE_URL } from '@/lib/env';
import type { IAuth } from '@/types';
import { storageKeys } from '@/constants/storage-keys';
import endpoint from './endpoint';

// Injected at startup by root _layout.tsx so the class stays testable
let _redirectFn: (() => void) | null = null;

class AuthService {
  private refreshPromise: Promise<IAuth> | null = null;

  setRedirectFn(fn: () => void) {
    _redirectFn = fn;
  }

  redirectToLogin(): void {
    _redirectFn?.();
  }

  isAccessTokenExpired(auth: IAuth): boolean {
    if (!auth?.expires_at) return true;
    return dayjs().add(5, 'minutes').isAfter(dayjs(auth.expires_at));
  }

  isRefreshTokenExpired(auth: IAuth): boolean {
    if (!auth?.refresh_expires_at) return true;
    return dayjs().isAfter(dayjs(auth.refresh_expires_at));
  }

  async getAuthData(): Promise<IAuth | null> {
    try {
      const raw = await secureStorage.getItem(storageKeys.auth);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async setAuthData(authData: IAuth): Promise<void> {
    await secureStorage.setItem(storageKeys.auth, JSON.stringify(authData));
  }

  async clearAuth(): Promise<void> {
    await secureStorage.deleteItem(storageKeys.auth);
  }

  async refreshAccessToken(): Promise<IAuth> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    this.refreshPromise = this._performTokenRefresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _performTokenRefresh(): Promise<IAuth> {
    const authData = await this.getAuthData();

    if (!authData) throw new Error('No authentication data found');

    if (this.isRefreshTokenExpired(authData)) {
      this.redirectToLogin();
      throw new Error('Refresh token expired');
    }

    try {
      const response = await Axios.post(`${API_BASE_URL}${endpoint.refreshToken}`, {
        refresh_token: authData.refresh_token,
      });

      if (response.data?.success && response.data?.data) {
        const newAuth: IAuth = response.data.data;
        await this.setAuthData(newAuth);
        return newAuth;
      }
      throw new Error('Failed to refresh token');
    } catch (error) {
      this.redirectToLogin();
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      const authData = await this.getAuthData();
      if (authData) {
        await Axios.delete(`${API_BASE_URL}${endpoint.logout}`, {
          headers: { Authorization: `Bearer ${authData.access_token}` },
        });
      }
    } catch {
      // silent
    } finally {
      await this.clearAuth();
    }
  }
}

export const authService = new AuthService();
