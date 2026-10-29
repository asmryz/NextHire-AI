// frontend/src/services/api.js
// Owner: Aarian (everyone uses it)
// Every API call goes through this. It adds the JWT automatically and
// logs the user out when the session has expired.
//
//   import api, { getErrorMessage } from '../../services/api';
//   const { data } = await api.get('/departments');
import axios from 'axios';

export const TOKEN_KEY = 'nexhire_token';
export const USER_KEY = 'nexhire_user';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const isLoginCall = error.config?.url?.includes('/auth/login');

    // Session expired / account removed -> back to login (SRS: "Your session has expired")
    if (status === 401 && !isLoginCall && ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'ACCOUNT_INACTIVE'].includes(code)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login?expired=1');
      }
    }
    return Promise.reject(error);
  }
);

// Turns any error into one readable sentence for the screen
export function getErrorMessage(error) {
  if (!error.response) return 'System temporarily unavailable. Please try again later.';
  return error.response.data?.message || 'Something went wrong. Please try again.';
}

// Field errors from the backend: { email: '...', cnic: '...' }
export function getFieldErrors(error) {
  return error.response?.data?.errors || {};
}

export default api;
