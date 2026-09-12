import Axios from 'axios';
import dayjs from 'dayjs';
import { secureStorage } from '@/lib/secure-storage';
import { API_BASE_URL } from '@/lib/env';
import type { IAuth } from '@/types';
import endpoint from './endpoint';
import { commitRefreshedCredentials } from '@/features/auth/session-coordinator';
import { normalizeAuthCompletion } from './contract-adapter';
import { getMementoClientHeaders } from './client-runtime-metadata';
import {
  persistSessionCredentials,
  readSessionCredentials,
} from '@/features/auth/session-credentials';

class AuthService {
  private refreshPromise: Promise<IAuth> | null = null;

  isAccessTokenExpired(auth: IAuth): boolean {
    const expiry = auth?.access_expires_at || auth?.expires_at;
    if (!expiry) return true;
    return dayjs().add(5, 'minutes').isAfter(dayjs(expiry));
  }

  isRefreshTokenExpired(auth: IAuth): boolean {
    if (!auth?.refresh_expires_at) return true;
    return dayjs().isAfter(dayjs(auth.refresh_expires_at));
  }

  async getAuthData(): Promise<IAuth | null> {
    try {
      return await readSessionCredentials(secureStorage);
    } catch {
      return null;
    }
  }

  async setAuthData(authData: IAuth): Promise<void> {
    await persistSessionCredentials(authData, secureStorage);
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
      }, {
        headers: getMementoClientHeaders(),
      });

      const completion = normalizeAuthCompletion(response.data);
      if (completion.kind === 'session') {
        await commitRefreshedCredentials(completion.credentials);
        return completion.credentials;
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
          headers: {
            ...getMementoClientHeaders(),
            Authorization: `Bearer ${authData.access_token}`,
          },
        });
      }
    } catch {
      // silent
    }
  }
}

export const authService = new AuthService();
