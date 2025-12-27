import axios from 'axios';

/**
 * API Client Configuration
 * - Production: VITE_API_URL must be set to https://meterproof.onrender.com/api
 * - Local dev: Falls back to http://localhost:5000/api
 */
const getApiBaseUrl = () => {
    // In production, VITE_API_URL should be: https://meterproof.onrender.com/api
    const envUrl = import.meta.env.VITE_API_URL;
    
    if (envUrl) {
        // Use envUrl directly - it should already include /api
        return envUrl;
    }
    
    // Local development fallback
    if (import.meta.env.DEV) {
        return `http://${window.location.hostname}:5000/api`;
    }
    
    // Production fallback (behind reverse proxy)
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
