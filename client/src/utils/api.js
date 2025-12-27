import axios from 'axios';

/**
 * API Client Configuration
 * Uses VITE_API_URL; in dev if missing, falls back to same-host port 5000.
 * In prod, uses relative '/api' if env not set (behind reverse proxy).
 */
const getApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) return envUrl;
    if (import.meta.env.DEV) return `http://${window.location.hostname}:5000/api`;
    return '/api';
};

const api = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 30000,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['x-auth-token'] = token;
    }
    return config;
});

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
        }
        return Promise.reject(error);
    }
);

export default api;
