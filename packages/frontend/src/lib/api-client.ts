import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage (Zustand persist) - only on client
    if (typeof window !== 'undefined') {
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const { state } = JSON.parse(authStorage);
          if (state?.accessToken) {
            config.headers.Authorization = `Bearer ${state.accessToken}`;
          }
        }
      } catch (error) {
        console.error('Error parsing auth storage:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (typeof window !== 'undefined') {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const { state } = JSON.parse(authStorage);
            if (state?.refreshToken) {
              // Try to refresh the token
              const response = await axios.post(`${API_URL}/api/auth/refresh-token`, {
                refreshToken: state.refreshToken,
              });

              const { accessToken, refreshToken } = response.data;

              // Update tokens in storage
              const updatedState = {
                ...state,
                accessToken,
                refreshToken,
              };
              localStorage.setItem('auth-storage', JSON.stringify({ state: updatedState }));

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return apiClient(originalRequest);
            }
          }
        }
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    return Promise.reject(handleApiError(error));
  }
);

// Error handler to format error messages
function handleApiError(error: AxiosError): Error {
  if (error.response) {
    // Server responded with error status
    const data = error.response.data as Record<string, unknown>;
    const message = (data?.message as string) || (data?.error as string) || 'An error occurred';
    const err = new ApiError(message, error.response.status, data);
    return err;
  } else if (error.request) {
    // Request made but no response received
    return new Error('No response from server. Please check your connection.');
  } else {
    // Error in request setup
    return new Error(error.message || 'An error occurred');
  }
}

// Helper function to handle API errors in components
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

// Type-safe API error class
export class ApiError extends Error {
  status?: number;
  data?: Record<string, unknown>;

  constructor(message: string, status?: number, data?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}
