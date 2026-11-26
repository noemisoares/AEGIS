import axios from 'axios';

// Normalize API Base URL supporting both relative paths (dev proxy) and absolute URLs (production / Vercel -> Render)
let rawBase = ((import.meta as any).env?.VITE_API_URL as string) || '/api';
if (rawBase.endsWith('/')) {
  rawBase = rawBase.slice(0, -1);
}

export const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aegis_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('aegis_token');
      localStorage.removeItem('aegis_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
