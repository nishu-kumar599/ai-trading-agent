/**
 * Utility helper to automatically inject Authorization: Bearer <token>
 * on frontend API requests to protected server endpoints.
 */

export function getAuthHeaders(customHeaders = {}) {
  const token = localStorage.getItem('aitrader_token');
  const headers = {
    ...customHeaders
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export async function authFetch(url, options = {}) {
  const headers = getAuthHeaders(options.headers || {});
  return fetch(url, {
    ...options,
    headers
  });
}
