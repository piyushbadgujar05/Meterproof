import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://meterproof.onrender.com/api",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers["x-auth-token"] = token;
  return config;
});

export default api;
