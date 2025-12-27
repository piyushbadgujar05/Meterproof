import axios from "axios";

/**
 * API Configuration
 * - Local: http://localhost:5000/api (when VITE_API_URL not set)
 * - Production: https://meterproof.onrender.com/api (via VITE_API_URL)
 */
const getBaseUrl = () => {
  // Check for environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Local development
  if (import.meta.env.DEV) {
    return "http://localhost:5000/api";
  }
  
  // Production fallback
  return "https://meterproof.onrender.com/api";
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["x-auth-token"] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log for debugging
    console.error("[API Error]", {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.msg || error.message,
    });
    
    // Clear token on 401
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
    }
    
    return Promise.reject(error);
  }
);

export default api;
