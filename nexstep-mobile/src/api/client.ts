import axios, { InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3001';
type TokenGetter = ((opts?: { skipCache?: boolean }) => Promise<string | null>) | null;
let tokenGetter: TokenGetter = null;

export function setApiTokenGetter(getter: TokenGetter) {
  tokenGetter = getter;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client': 'NexStep-Mobile/2.0',
  },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const method = String(config.method || 'get').toUpperCase();
  const skipCache = method !== 'GET' && method !== 'HEAD';
  const token = tokenGetter ? await tokenGetter({ skipCache }).catch(() => null) : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
