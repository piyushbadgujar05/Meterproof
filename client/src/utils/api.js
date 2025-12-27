import axios from 'axios';

/**
 * API Client
 * VITE_API_URL MUST be set in environment:
 * - Local: http://localhost:5000/api
 * - Production: https://meterproof.onrender.com/api
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 30000,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  // Debug log the full URL being called
  console.log('[API Request]', config.method?.toUpperCase(), config.baseURL + config.url);
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error.response?.status, error.config?.url);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default api;
