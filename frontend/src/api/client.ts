import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authApi } from './auth';
import { isTokenExpiringSoon } from '../utils/token.utils';

const API_BASE_URL =
  import.meta.env.VITE_APP_API_URL || 'http://localhost:3090/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getSessionToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return sessionStorage.getItem('token');
  } catch {
    return null;
  }
};

const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return sessionStorage.getItem('refreshToken');
  } catch {
    return null;
  }
};

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.request.use(
  async (config) => {
    const token = getSessionToken();

    // Check if token is expiring soon and refresh proactively
    if (token && isTokenExpiringSoon(token)) {
      const refreshToken = getRefreshToken();
      const currentPath = window.location.pathname;

      // Only refresh if we have a refresh token and we're not on auth pages
      if (
        refreshToken &&
        !currentPath.includes('/login') &&
        !currentPath.includes('/register')
      ) {
        // If already refreshing, wait for that refresh to complete
        if (isRefreshing && refreshPromise) {
          try {
            const newToken = await refreshPromise;
            if (newToken) {
              config.headers.Authorization = `Bearer ${newToken}`;
              return config;
            }
          } catch {
            // If refresh failed, continue with old token - response interceptor will handle 401
          }
        } else if (!isRefreshing) {
          // Start refresh
          isRefreshing = true;
          refreshPromise = (async () => {
            try {
              const response = await authApi.refreshToken(refreshToken);
              const { accessToken, refreshToken: newRefreshToken } = response;

              if (accessToken) {
                sessionStorage.setItem('token', accessToken);
                if (newRefreshToken) {
                  sessionStorage.setItem('refreshToken', newRefreshToken);
                }
                return accessToken;
              }
              return null;
            } catch (refreshError) {
              console.warn('Proactive token refresh failed:', refreshError);
              return null;
            } finally {
              isRefreshing = false;
              refreshPromise = null;
            }
          })();

          try {
            const newToken = await refreshPromise;
            if (newToken) {
              config.headers.Authorization = `Bearer ${newToken}`;
              return config;
            }
          } catch {
            // Continue with old token if refresh fails
          }
        }
      }
    }

    // Use current token (or newly refreshed token)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      const currentPath = window.location.pathname;

      // Don't try to refresh if we're on login/register pages or no refresh token
      if (
        !refreshToken ||
        currentPath.includes('/login') ||
        currentPath.includes('/register')
      ) {
        isRefreshing = false;
        processQueue(error, null);
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('refreshToken');
        if (
          !currentPath.includes('/login') &&
          !currentPath.includes('/register')
        ) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response = await authApi.refreshToken(refreshToken);
        const { accessToken, refreshToken: newRefreshToken } = response;

        if (!accessToken) {
          throw new Error('No access token received from refresh');
        }

        // Update stored tokens
        sessionStorage.setItem('token', accessToken);
        if (newRefreshToken) {
          sessionStorage.setItem('refreshToken', newRefreshToken);
        }

        // Update the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        isRefreshing = false;
        processQueue(null, accessToken);

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);

        // Log the error for debugging
        const error = refreshError as AxiosError;
        console.error('Token refresh failed:', {
          error: refreshError,
          message: error.response?.data
            ? (error.response.data as { message?: string }).message
            : error.message,
          status: error.response?.status,
          path: currentPath,
        });

        // Only clear tokens and redirect if refresh truly failed
        // Don't clear if it's a network error - user might come back online
        const isNetworkError = !error.response;
        const isAuthError =
          error.response?.status === 401 || error.response?.status === 403;

        if (isAuthError || !isNetworkError) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('refreshToken');

          // Only redirect if we're not already on the login/register page
          if (
            !currentPath.includes('/login') &&
            !currentPath.includes('/register')
          ) {
            window.location.href = '/login';
          }
        }

        return Promise.reject(refreshError);
      }
    }

    // Handle email verification required - don't redirect, let frontend handle with modals
    // The modal will show on dashboard/assessment pages for unverified users
    // if (error.response?.status === 403 && error.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
    //     const currentPath = window.location.pathname;
    //     if (!currentPath.includes('/verify-email')) {
    //         window.location.href = '/verify-email';
    //     }
    // }
    return Promise.reject(error);
  }
);

export default api;
