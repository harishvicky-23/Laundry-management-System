// src/utils/api.js

const BASE_URL = 'http://localhost:8000';

export function decodeToken(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

export function getRoleFromToken() {
  const token = localStorage.getItem('token');
  const decoded = decodeToken(token);
  return decoded ? decoded.role : null;
}

export function isAuthenticated() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  // Basic expiry check (exp is in seconds)
  const decoded = decodeToken(token);
  if (!decoded) return false;
  if (decoded.exp && decoded.exp * 1000 < Date.now()) {
    localStorage.removeItem('token');
    return false;
  }
  return true;
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // Handle 401 Unauthorized globally (except for the login request itself)
    if (response.status === 401 && !path.includes('/login') && !path.includes('/token')) {
      localStorage.removeItem('token');
      window.location.href = '/';
      return;
    }

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      // Return details from backend if available
      const errorMessage = (data && (data.detail || data.message)) || response.statusText || 'An error occurred';
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error(`API Error on ${options.method || 'GET'} ${path}:`, error);
    throw error;
  }
}

export const api = {
  get: (path, options) => request(path, { method: 'GET', ...options }),
  post: (path, body, options) => request(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: (path, body, options) => request(path, { method: 'PUT', body: JSON.stringify(body), ...options }),
  patch: (path, body, options) => request(path, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: (path, options) => request(path, { method: 'DELETE', ...options }),
  login: async (username, password) => {
    // We try to hit the JSON /login endpoint first since it is the actual backend endpoint.
    // If it fails or we want to support multiple configurations, we fetch and catch.
    try {
      const response = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }
      return data; // returns { access_token, token_type }
    } catch (err) {
      // If there's an error, fallback to URL-encoded form data to /token as a safety net (if defined elsewhere)
      console.warn('JSON login failed, trying URL encoded login to /token...', err);
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await fetch(`${BASE_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || err.message || 'Login failed');
      }
      return data;
    }
  }
};
