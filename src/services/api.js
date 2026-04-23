import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';
const BASE_URL = `${API_URL}/api`;

const api = axios.create({ baseURL: BASE_URL });

if (typeof window !== 'undefined') {
  // Helpful when debugging Capacitor builds that may cache old web assets.
  console.info('[api] baseURL =', BASE_URL);
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  console.info('[api][request]', config.method?.toUpperCase(), config.baseURL + config.url);
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    console.error('[api][error]', {
      url: err.config?.baseURL ? `${err.config.baseURL}${err.config?.url || ''}` : err.config?.url,
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          err.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(err.config);
        }
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
