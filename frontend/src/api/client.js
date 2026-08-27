import axios from 'axios';

const TOKEN_KEY = 'icpanel_token';

const api = axios.create({ baseURL: '/api' });

// Attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-signout on expired/invalid tokens
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (
      err.response &&
      err.response.status === 401 &&
      window.location.pathname !== '/login'
    ) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

/** Extract a human-friendly error message from an axios error. */
export const getError = (err, fallback = 'Something went wrong') =>
  (err.response && err.response.data && err.response.data.error) || fallback;

export default api;
