import Axios from 'axios';
import dayjs from 'dayjs';
import { secureStorage } from '@/lib/secure-storage';
import { API_BASE_URL } from '@/lib/env';
import type { IAuth } from '@/types';
import { storageKeys } from '@/constants/storage-keys';
import endpoint from './endpoint';
import { commitRefreshedCredentials } from '@/features/auth/session-coordinator';

class AuthService {
  private refreshPromise: Promise<IAuth> | null = null;

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
      throw new Error('Refresh token expired');
    }

    try {
      const response = await Axios.post(`${API_BASE_URL}${endpoint.refreshToken}`, {
        refresh_token: authData.refresh_token,
      });

      if (response.data?.success && response.data?.data) {
        const newAuth: IAuth = response.data.data;
        await commitRefreshedCredentials(newAuth);
        return newAuth;
      }
      throw new Error('Failed to refresh token');
    } catch (error) {
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
    }
  }
}

export const authService = new AuthService();
