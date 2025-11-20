import axios from 'axios';

// En producción, la API estará en el mismo dominio
const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' 
    ? window.location.origin 
    : 'http://localhost:4000');

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

// Interceptor para agregar el token a las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      window.location.href = `${basePath}/login`;
    }
    return Promise.reject(error);
  },
);

export default api;

